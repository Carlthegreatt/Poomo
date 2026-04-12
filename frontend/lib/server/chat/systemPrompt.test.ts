import { describe, expect, it } from "vitest";
import type { ValidatedAppContext } from "@/lib/ai/chatApiSchema";
import { buildSystemPrompt } from "@/lib/server/chat/systemPrompt";

function minimalContext(
  overrides: Partial<ValidatedAppContext> = {},
): ValidatedAppContext {
  return {
    timer: {
      phase: "WORK",
      isRunning: true,
      remainingMs: 60_000,
    },
    columns: ["Todo"],
    tasks: [],
    events: [],
    stats: {
      todayCount: 0,
      todayMinutes: 0,
      thisWeekSessions: 0,
      thisWeekMinutes: 0,
      totalSessions: 0,
      totalFocusMinutes: 0,
      currentStreak: 0,
      bestStreak: 0,
    },
    notes: [],
    ...overrides,
  };
}

describe("buildSystemPrompt", () => {
  it("includes timer and column context", () => {
    const prompt = buildSystemPrompt(minimalContext());
    expect(prompt).toContain("Poomo AI");
    expect(prompt).toContain("Focus");
    expect(prompt).toContain("1m 0s");
    expect(prompt).toContain("Kanban columns (left-to-right): Todo");
  });

  it("lists tasks when provided", () => {
    const prompt = buildSystemPrompt(
      minimalContext({
        tasks: [
          {
            title: "Buy milk",
            column: "Todo",
            due_date: "2026-04-12",
            due_time: null,
            description: null,
            priority: "high",
            task_type: "errand",
          },
        ],
      }),
    );
    expect(prompt).toContain("Buy milk");
    expect(prompt).toContain("high priority");
  });
});
