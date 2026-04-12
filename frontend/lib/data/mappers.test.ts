import { describe, it, expect } from "vitest";
import { focusSessionFromRow, focusSessionToRow } from "@/lib/data/mappers";

describe("focusSession mappers", () => {
  it("maps row to app shape", () => {
    const row = {
      id: "a",
      started_at: "2026-01-01T10:00:00.000Z",
      ended_at: "2026-01-01T10:25:00.000Z",
      phase: "focus",
      duration_ms: 1_500_000,
      task_id: "task-1",
      task_title: "Write tests",
    };
    expect(focusSessionFromRow(row)).toEqual({
      id: "a",
      startedAt: row.started_at,
      endedAt: row.ended_at,
      phase: "focus",
      durationMs: 1_500_000,
      taskId: "task-1",
      taskTitle: "Write tests",
    });
  });

  it("maps app shape to insert row", () => {
    const row = focusSessionToRow("user-1", {
      id: "b",
      startedAt: "2026-01-02T10:00:00.000Z",
      endedAt: "2026-01-02T10:05:00.000Z",
      phase: "shortBreak",
      durationMs: 300_000,
      taskId: null,
      taskTitle: null,
    });
    expect(row.user_id).toBe("user-1");
    expect(row.id).toBe("b");
    expect(row.phase).toBe("shortBreak");
    expect(row.duration_ms).toBe(300_000);
  });
});
