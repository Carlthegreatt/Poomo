/** Markdown / plain lines that are model self-planning, not user-facing. */
const PLANNING_LINE_LABEL =
  /^\s*(?:\*+\s*|[-•]\s*)*(User asks|Context|Goal|Approach|Plan|Steps|Thought|Analysis|Reasoning|Response|Answer)\s*:/i;

/** Split one paragraph of Gemma-style meta ("...assistant. Keep responses...") into lines. */
function splitEmbeddedMetaSentences(text: string): string {
  return text
    .replace(/\.\s+(?=The user\b)/gi, ".\n")
    .replace(/\.\s+(?=The persona\b)/gi, ".\n")
    .replace(/\.\s+(?=As Poomo AI\b)/gi, ".\n")
    .replace(/\.\s+(?=I need to respond\b)/gi, ".\n")
    .replace(/\.\s+(?=I must follow\b)/gi, ".\n")
    .replace(/\.\s+(?=I should\b)/gi, ".\n")
    .replace(/\.\s+(?=Constraint\b)/gi, ".\n")
    .replace(/\.\s+(?=Response\b)/gi, ".\n")
    .replace(/\.\s+(?=Keep responses short\b)/gi, ".\n")
    .replace(/\.\s+(?=No preamble\b)/gi, ".\n");
}

/**
 * Strip "The user is asking… / Constraints: / Plan: / 1. …" style coaching preambles
 * before the real answer (including "Here is how to do it:" bridges).
 */
function stripCoachingPlanPreamble(text: string): string {
  const lines = splitEmbeddedMetaSentences(text).split("\n");
  let i = 0;
  let sawMeta = false;

  const normalizeLead = (line: string) =>
    line.trim().replace(/^.(?=The\s+user\b)/, "");

  while (i < lines.length) {
    const rawLine = lines[i] ?? "";
    const s = normalizeLead(rawLine);
    if (s === "") {
      i++;
      continue;
    }

    const gluedNoPlanning = s.match(
      /^No preamble,?\s*no meta-talk,?\s*no planning\.\s+(.+)$/i,
    );
    if (gluedNoPlanning?.[1]?.trim()) {
      return [gluedNoPlanning[1].trim(), ...lines.slice(i + 1)]
        .join("\n")
        .trim();
    }

    const numBridge = rawLine.match(
      /^\s*\d+\.\s+[\s\S]*?\b(Here(?:'|’)?s how (?:to do it|it works)|Here is how (?:to do it)?)\s*:\s*(.*)$/i,
    );
    if (numBridge) {
      const tail = (numBridge[2] ?? "").trim();
      const after = lines.slice(i + 1).join("\n");
      const combined = [tail, after]
        .filter((x) => x.length > 0)
        .join("\n")
        .trim();
      if (combined.length >= 8) return combined;
    }

    if (
      /^The user said\b|^The user is initiating\b|^The user is asking\b|^When the user asks\b|^In the context of\b/i.test(
        s,
      )
    ) {
      sawMeta = true;
      i++;
      continue;
    }

    if (
      /^The persona is\b|^My (?:role|persona) is\b|^I am (?:acting as|playing)\b/i.test(
        s,
      )
    ) {
      sawMeta = true;
      i++;
      continue;
    }

    if (/^As Poomo AI\b/i.test(s)) {
      sawMeta = true;
      i++;
      continue;
    }

    if (
      /^I need to respond as\b|^I need to act as\b|^I need to follow\b|^I'm (?:required|expected) to respond as\b/i.test(
        s,
      )
    ) {
      sawMeta = true;
      i++;
      continue;
    }

    if (
      /^I must follow\b|^I must adhere\b|^I must comply\b|^I need to comply\b/i.test(
        s,
      )
    ) {
      sawMeta = true;
      i++;
      continue;
    }

    if (
      /^no preamble,?\s+no third person\b|^no third person,?\s+no planning\b/i.test(
        s,
      )
    ) {
      sawMeta = true;
      i++;
      continue;
    }

    if (
      /^I should (?:check|provide|give|offer|explain|respond|answer|reference|use|mention|focus on|summarize|describe|list|not)\b/i.test(
        s,
      )
    ) {
      sawMeta = true;
      i++;
      continue;
    }

    if (
      /^Keep responses short\b|^Stay (?:friendly|concise)\b|^Remember to\b|^Output rules?\s*:/i.test(
        s,
      )
    ) {
      sawMeta = true;
      i++;
      continue;
    }

    if (
      /^No preamble\b|^No meta-talk\b|^No planning\b|^No chain-of-thought\b/i.test(
        s,
      )
    ) {
      sawMeta = true;
      i++;
      continue;
    }

    if (
      /^I need to (?:explain|describe|list|provide|break down)\b|^I will (?:explain|describe)\b|^I'll (?:explain|describe|walk you through)\b/i.test(
        s,
      )
    ) {
      sawMeta = true;
      i++;
      continue;
    }

    if (/^Constraints?\s*:/i.test(s)) {
      sawMeta = true;
      i++;
      while (i < lines.length) {
        const L = (lines[i] ?? "").trim();
        if (/^Plan\s*:/i.test(L)) break;
        if (L === "") {
          i++;
          continue;
        }
        if (/^[-–—]\s/.test(L) || /^\*\s+/.test(L)) {
          i++;
          continue;
        }
        break;
      }
      continue;
    }

    if (/^Plan\s*:/i.test(s)) {
      sawMeta = true;
      i++;
      continue;
    }

    if (/^\s*\d+\.\s/.test(rawLine)) {
      if (sawMeta) {
        i++;
        continue;
      }
      return lines.slice(i).join("\n").trim();
    }

    if (sawMeta) {
      const responseBridge = rawLine.match(/^\s*Response\s*:\s*(.*)$/i);
      if (responseBridge) {
        const tail = (responseBridge[1] ?? "").trim();
        const after = lines.slice(i + 1).join("\n");
        const combined = [tail, after]
          .filter((x) => x.length > 0)
          .join("\n")
          .trim();
        if (combined.length >= 4) return combined;
        if (after.trim().length >= 4) return after.trim();
        i++;
        continue;
      }

      const bridgeLine = rawLine.match(
        /^\s*(Here(?:'|’)?s how (?:to do it|it works)|Here is how (?:to do it)?)\s*:\s*(.*)$/i,
      );
      if (bridgeLine) {
        const tail = (bridgeLine[2] ?? "").trim();
        const after = lines.slice(i + 1).join("\n");
        const combined = [tail, after]
          .filter((x) => x.length > 0)
          .join("\n")
          .trim();
        if (combined.length >= 4) return combined;
        if (after.trim().length >= 4) return after.trim();
      }
    }

    return lines.slice(i).join("\n").trim();
  }

  return sawMeta ? "" : text.trim();
}

/**
 * Strip bullet lists like "* User asks: … * Context: …" and Constraint lines
 * where the real answer is appended after the constraint sentence.
 */
function stripStructuredPlanningPreamble(raw: string): string {
  const normalized = raw.replace(
    /\s+(?=\s*\*\s*(?:User asks|Context|Goal|Constraint|Approach|Plan|Steps)\s*:)/gi,
    "\n",
  );
  const lines = normalized.split("\n");
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i] ?? "";
    const trimmed = rawLine.trim();
    if (trimmed === "") {
      i++;
      continue;
    }

    const constraintM = rawLine.match(
      /^\s*(?:\*+\s*|[-•]\s*)*Constraint\s*:\s*(.*)$/i,
    );
    if (constraintM) {
      const rest = constraintM[1] ?? "";
      const inline = rest.match(/^([\s\S]+?)\.\s+([A-Za-z0-9"'(][\s\S]*)$/);
      if (inline?.[2] && inline[2].trim().length >= 8) {
        return [inline[2].trim(), ...lines.slice(i + 1)].join("\n").trim();
      }
      i++;
      continue;
    }

    if (PLANNING_LINE_LABEL.test(rawLine)) {
      i++;
      continue;
    }

    return lines.slice(i).join("\n").trim();
  }

  return raw.trim();
}

/**
 * Some models prepend chain-of-thought or instruction-echo text before the real reply.
 * Strip that so the user only sees the assistant message.
 */
export function stripModelThinkingPreamble(raw: string): string {
  const unfolded = splitEmbeddedMetaSentences(raw.trim());
  let t = stripStructuredPlanningPreamble(unfolded);
  if (!t) t = raw.trim();
  const afterCoaching = stripCoachingPlanPreamble(t);
  if (afterCoaching.length > 0) t = afterCoaching;
  if (!t) return raw.trim();

  t = t.replace(/([.!?])([A-Za-z])/g, "$1 $2");

  const userFacingStart =
    /\b(?:Hi there[!,.]?|Hi(?: there)?[!,.]?|Hello[!,.]?|Hey[!,.]?|Good (?:morning|afternoon|evening)[!,.]?|I'd love to help|I'?d be happy to help|Happy to help|Sure[!,.]?|Of course[!,.]?|Absolutely[!,.]?\s+(?:—|-|–)\s*|Could you (?:please )?(?:paste|share|send)|Please (?:paste|share|send)|Go ahead and (?:paste|share)|What would you like me to (?:organize|sort)|Tell me what you(?:'|’)d like organized|Drop (?:your |the )?(?:notes|text) here)\b/i;
  const hit = userFacingStart.exec(t);
  if (hit?.index != null) {
    const slice = t.slice(hit.index).trim();
    if (slice.length >= 6) return slice;
  }

  const lines = t.split("\n");
  const kept: string[] = [];
  let seenUserLine = false;
  for (const line of lines) {
    const s = line.trim();
    if (!s) {
      if (seenUserLine) kept.push(line);
      continue;
    }
    const metaColon =
      /^(According to\b|When the user\b|I should not\b|I need to\b|I will not\b|I'?ll need to\b|I have to\b|I will explain\b|I'll explain\b|The instructions say\b|Based on the\b|Looking at\b|The system instructions\b|Per the\b|User asks\b|Context\b|Goal\b|Constraint\b|Constraints\b|Approach\b|Steps\b|Plan\b)\s*:/i.test(
        s,
      );
    const metaPlain =
      /^(The user said\b|The user is initiating\b|The user is asking\b|The persona is\b|As Poomo AI\b|I need to respond as\b|I need to act as\b|I need to follow\b|I'm (?:required|expected) to respond as\b|I must follow\b|I must adhere\b|I must comply\b|I need to comply\b|no preamble,?\s+no third person\b|no third person,?\s+no planning\b|I should (?:check|provide|give|offer|explain|respond|answer|reference|use|mention|focus on|summarize|describe|list|not)\b|Keep responses short\b|No preamble,?\s*no meta-talk|No meta-talk,?\s*no planning|No preamble\b|No planning\b|No meta-talk\b|Response:\s*$)/i.test(
        s,
      );
    const meta = metaColon || metaPlain;
    if (meta && !seenUserLine) continue;
    seenUserLine = true;
    kept.push(line);
  }
  const joined = kept.join("\n").trim();
  if (joined.length >= 6) return joined;

  return raw.trim();
}
