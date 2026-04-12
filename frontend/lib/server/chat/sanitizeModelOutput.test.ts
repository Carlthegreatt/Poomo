import { describe, expect, it } from "vitest";
import { stripModelThinkingPreamble } from "@/lib/server/chat/sanitizeModelOutput";

describe("stripModelThinkingPreamble", () => {
  it("passes through short user-facing text", () => {
    expect(stripModelThinkingPreamble("Hello! Ready when you are.")).toContain(
      "Hello",
    );
  });

  it("strips leading The user is asking meta line", () => {
    const raw =
      "The user is asking for a summary.\n\nHere is the summary: one thing.";
    const out = stripModelThinkingPreamble(raw);
    expect(out).not.toMatch(/^The user is asking/i);
    expect(out.length).toBeGreaterThan(0);
  });
});
