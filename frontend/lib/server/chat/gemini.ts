import { ApiError, GoogleGenAI, type GenerateContentResponse } from "@google/genai";
import { MODELS } from "@/lib/server/chat/constants";
import { chatDebug } from "@/lib/server/chat/debug";

export function createChatGenAI(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });
}

function isRateLimitError(error: unknown): boolean {
  if (error instanceof ApiError) {
    const s = error.status;
    if (s === 429 || s === 503) return true;
  }
  if (!(error instanceof Error)) return false;
  const msg = error.message;
  return (
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("503") ||
    msg.includes("UNAVAILABLE")
  );
}

export async function callGeminiWithFallback(
  genai: GoogleGenAI,
  config: Omit<Parameters<GoogleGenAI["models"]["generateContent"]>[0], "model"> & {
    model?: string;
  },
): ReturnType<GoogleGenAI["models"]["generateContent"]> {
  let lastError: unknown;

  for (const model of MODELS) {
    try {
      chatDebug("calling Gemini", model);
      const out = await genai.models.generateContent({ ...config, model });
      chatDebug("Gemini ok", model, {
        candidates: out.candidates?.length ?? 0,
      });
      return out;
    } catch (error: unknown) {
      lastError = error;
      if (!isRateLimitError(error)) throw error;
      console.warn(`[chat] ${model} rate-limited, trying next model`);
      chatDebug("rate-limit / overload, next model", model, {
        status: error instanceof ApiError ? error.status : undefined,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  throw lastError;
}

type GenerateContentStreamParams = Omit<
  Parameters<GoogleGenAI["models"]["generateContentStream"]>[0],
  "model"
> & { model?: string };

/**
 * Same fallback order as {@link callGeminiWithFallback}, but returns the SDK
 * streaming iterator (async generator of response chunks).
 */
export async function callGeminiWithFallbackStream(
  genai: GoogleGenAI,
  config: GenerateContentStreamParams,
): Promise<AsyncGenerator<GenerateContentResponse>> {
  let lastError: unknown;

  for (const model of MODELS) {
    try {
      chatDebug("calling Gemini stream", model);
      const stream = await genai.models.generateContentStream({
        ...config,
        model,
      });
      chatDebug("Gemini stream ok", model, {});
      return stream;
    } catch (error: unknown) {
      lastError = error;
      if (!isRateLimitError(error)) throw error;
      console.warn(`[chat] ${model} rate-limited, trying next model`);
      chatDebug("rate-limit / overload, next model (stream)", model, {
        status: error instanceof ApiError ? error.status : undefined,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  throw lastError;
}
