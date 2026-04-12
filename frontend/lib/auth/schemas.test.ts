import { describe, it, expect } from "vitest";
import {
  authPasswordValueSchema,
  forgotPasswordFormSchema,
  signInPasswordFormSchema,
  signUpPasswordFormSchema,
  updatePasswordFormSchema,
} from "@/lib/auth/schemas";

describe("authPasswordValueSchema", () => {
  it("accepts strong enough passwords", () => {
    expect(authPasswordValueSchema.safeParse("abcd1234").success).toBe(true);
    expect(authPasswordValueSchema.safeParse("Test1234").success).toBe(true);
  });

  it("rejects short passwords", () => {
    expect(authPasswordValueSchema.safeParse("a1").success).toBe(false);
  });

  it("requires a letter", () => {
    expect(authPasswordValueSchema.safeParse("12345678").success).toBe(false);
  });

  it("requires a digit", () => {
    expect(authPasswordValueSchema.safeParse("abcdefgh").success).toBe(false);
  });

  it("rejects overly long passwords", () => {
    const long = "a1" + "x".repeat(72);
    expect(authPasswordValueSchema.safeParse(long).success).toBe(false);
  });
});

describe("signInPasswordFormSchema", () => {
  it("parses valid sign-in payload", () => {
    const r = signInPasswordFormSchema.safeParse({
      email: "  u@example.com ",
      password: "secret",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("u@example.com");
  });

  it("rejects invalid email", () => {
    expect(
      signInPasswordFormSchema.safeParse({ email: "nope", password: "x" }).success,
    ).toBe(false);
  });
});

describe("signUpPasswordFormSchema", () => {
  it("accepts matching passwords", () => {
    const r = signUpPasswordFormSchema.safeParse({
      email: "user@example.com",
      password: "goodpass1",
      confirmPassword: "goodpass1",
    });
    expect(r.success).toBe(true);
  });

  it("rejects mismatched confirm", () => {
    const r = signUpPasswordFormSchema.safeParse({
      email: "user@example.com",
      password: "goodpass1",
      confirmPassword: "otherpass1",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path[0]);
      expect(paths).toContain("confirmPassword");
    }
  });
});

describe("forgotPasswordFormSchema", () => {
  it("requires valid email", () => {
    expect(forgotPasswordFormSchema.safeParse({ email: "x" }).success).toBe(false);
    expect(forgotPasswordFormSchema.safeParse({ email: "ok@example.com" }).success).toBe(
      true,
    );
  });
});

describe("updatePasswordFormSchema", () => {
  it("matches password rules and confirm", () => {
    const r = updatePasswordFormSchema.safeParse({
      password: "newpass9",
      confirmPassword: "newpass9",
    });
    expect(r.success).toBe(true);
  });
});
