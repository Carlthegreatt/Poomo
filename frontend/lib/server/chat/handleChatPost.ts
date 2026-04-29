import { ApiError } from "@google/genai";
import { chatPostBodySchema } from "@/lib/ai/chatApiSchema";
import { poomoTools, type ChatAction } from "@/lib/ai/tools";
import {
  buildConfirmation,
  collectValidatedActions,
  TOOL_TO_WIDGET,
} from "@/lib/server/chat/confirmations";
import { GENERIC_ERROR, MAX_BODY_BYTES, RATE_LIMIT_RETRY_AFTER_SEC } from "@/lib/server/chat/constants";
import { chatDebug } from "@/lib/server/chat/debug";
import {
  callGeminiWithFallbackStream,
  createChatGenAI,
} from "@/lib/server/chat/gemini";
import { isRateLimited } from "@/lib/server/chat/rateLimit";
import { getClientIp, readRequestTextWithLimit } from "@/lib/server/chat/requestAuth";
import { getServerSessionUser } from "@/lib/supabase/serverSession";
import { stripModelThinkingPreamble } from "@/lib/server/chat/sanitizeModelOutput";
import { buildSystemPrompt } from "@/lib/server/chat/systemPrompt";
import { headers } from "next/headers";

/** Validates the request origin against the app's own origin. */
async function isValidOrigin(req: Request): Promise<boolean> {
  const origin = req.headers.get("origin");
  if (!origin) return true; // Non-browser requests (curl, etc.) don't send Origin
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const expected = `${proto}://${host}`;
  return origin === expected;
}

type ContentPart = {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
};

export async function postChat(req: Request): Promise<Response> {
  if (!process.env.GEMINI_API_KEY) {
    chatDebug("reject: GEMINI_API_KEY missing");
    return Response.json({ error: GENERIC_ERROR }, { status: 503 });
  }

  // Validate origin to prevent cross-site abuse
  if (!(await isValidOrigin(req))) {
    chatDebug("reject: invalid origin", { origin: req.headers.get("origin") });
    return Response.json({ error: GENERIC_ERROR }, { status: 403 });
  }

  const genai = createChatGenAI();

  const { user } = await getServerSessionUser();
  if (!user) {
    chatDebug("reject: no session");
    return Response.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    chatDebug("reject: app rate limit", { ip });
    return Response.json(
      { error: GENERIC_ERROR },
      {
        status: 429,
        headers: { "Retry-After": String(RATE_LIMIT_RETRY_AFTER_SEC) },
      },
    );
  }

  const rawBody = await readRequestTextWithLimit(req, MAX_BODY_BYTES);
  if (!rawBody.ok) {
    return Response.json({ error: GENERIC_ERROR }, { status: 413 });
  }

  let json: unknown;
  try {
    json = rawBody.text ? JSON.parse(rawBody.text) : null;
  } catch (err) {
    chatDebug("reject: invalid JSON", err);
    return Response.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const parsed = chatPostBodySchema.safeParse(json);
  if (!parsed.success) {
    chatDebug("reject: body validation", parsed.error.flatten());
    return Response.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const { messages, context: validatedContext } = parsed.data;
  chatDebug("request", {
    ip,
    messageCount: messages.length,
    lastRole: messages[messages.length - 1]?.role,
    tasks: validatedContext.tasks.length,
    events: validatedContext.events.length,
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const streamIt = await callGeminiWithFallbackStream(genai, {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          contents: messages as any,
          config: {
            systemInstruction: buildSystemPrompt(validatedContext),
            tools: [{ functionDeclarations: poomoTools }],
            abortSignal: req.signal,
          },
        });

        const mergedParts: ContentPart[] = [];
        let rawForStrip = "";
        let emittedStrippedPrefix = "";
        let toolLocked = false;
        let lastFinishReason: string | undefined;
        let lastPromptFeedback: unknown;

        for await (const response of streamIt) {
          lastFinishReason = response.candidates?.[0]?.finishReason;
          lastPromptFeedback = response.promptFeedback;

          const parts = (response.candidates?.[0]?.content?.parts ??
            []) as ContentPart[];

          for (const p of parts) {
            if (p.functionCall?.name) {
              mergedParts.push({ functionCall: p.functionCall });
              toolLocked = true;
              continue;
            }
            const t = p.text ?? "";
            if (!t) continue;

            const last = mergedParts[mergedParts.length - 1];
            if (last && !last.functionCall && last.text !== undefined) {
              last.text = (last.text ?? "") + t;
            } else {
              mergedParts.push({ text: t });
            }

            if (!toolLocked) {
              rawForStrip += t;
              const s = stripModelThinkingPreamble(rawForStrip);
              if (s.startsWith(emittedStrippedPrefix)) {
                const d = s.slice(emittedStrippedPrefix.length);
                if (d) {
                  send({ type: "text_delta", content: d });
                }
                emittedStrippedPrefix = s;
              } else {
                send({ type: "text_delta", content: t });
                emittedStrippedPrefix =
                  stripModelThinkingPreamble(rawForStrip);
              }
            }
          }
        }

        if (mergedParts.length === 0) {
          chatDebug("empty candidate (stream)", {
            finishReason: lastFinishReason,
            promptFeedback: lastPromptFeedback,
          });
          send({ type: "error", message: GENERIC_ERROR });
        } else {
          const fnCalls = mergedParts
            .filter((p) => p.functionCall)
            .map((p) => p.functionCall!)
            .filter(Boolean);

          const textFromModel = mergedParts
            .filter((p) => !p.functionCall)
            .map((p) => p.text ?? "")
            .join("");

          if (fnCalls.length === 0) {
            const full = stripModelThinkingPreamble(textFromModel);
            if (
              full.length > emittedStrippedPrefix.length &&
              full.startsWith(emittedStrippedPrefix)
            ) {
              const tail = full.slice(emittedStrippedPrefix.length);
              if (tail) {
                send({ type: "text_delta", content: tail });
              }
            } else if (full && emittedStrippedPrefix.length === 0) {
              send({ type: "text_delta", content: full });
            }
          } else {
            const actions: ChatAction[] = collectValidatedActions(fnCalls);
            let widgetType: string | null = null;
            for (const a of actions) {
              if (!widgetType && TOOL_TO_WIDGET[a.tool]) {
                widgetType = TOOL_TO_WIDGET[a.tool];
              }
            }

            if (actions.length > 0) {
              send({ type: "assistant_reset" });
              const confirmation = buildConfirmation(actions);
              if (confirmation) {
                send({ type: "text_delta", content: confirmation });
              }
              send({ type: "actions", actions });
              chatDebug("stream actions", {
                count: actions.length,
                tools: actions.map((a) => a.tool),
              });
            } else if (textFromModel.trim()) {
              send({
                type: "text_delta",
                content: stripModelThinkingPreamble(textFromModel),
              });
            }

            if (widgetType) {
              send({ type: "widget", widget: widgetType });
            }
          }
        }
      } catch (error) {
        console.error("[chat] stream error:", error);
        chatDebug("stream error detail", {
          status: error instanceof ApiError ? error.status : undefined,
          message: error instanceof Error ? error.message : String(error),
        });
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: GENERIC_ERROR })}\n\n`,
          ),
        );
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
