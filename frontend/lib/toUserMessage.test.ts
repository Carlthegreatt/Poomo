import { describe, expect, it } from "vitest";
import { toUserMessage } from "@/lib/toUserMessage";

describe("toUserMessage", () => {
  it("reads Error.message", () => {
    expect(toUserMessage(new Error("x"))).toBe("x");
  });

  it("reads Postgrest-like objects", () => {
    expect(
      toUserMessage({ message: "row-level security", details: "", hint: "" }),
    ).toBe("row-level security");
  });

  it("uses fallback", () => {
    expect(toUserMessage(null)).toBe("Something went wrong");
    expect(toUserMessage(42, "nope")).toBe("nope");
  });
});
