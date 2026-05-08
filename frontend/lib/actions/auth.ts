"use server";

import { headers } from "next/headers";
import { createServerSupabase } from "@/lib/supabase/server";
import { mapAuthError } from "@/lib/auth/errors";
import {
  forgotPasswordFormSchema,
  signInPasswordFormSchema,
  signUpPasswordFormSchema,
  updatePasswordFormSchema,
} from "@/lib/auth/schemas";

const NO_SESSION_AFTER_SIGNUP =
  "No session after sign-up. In Supabase: Authentication → Providers → Email → turn off “Confirm email”, or see frontend/lib/auth/SUPABASE_SETUP.md.";

export type AuthActionResult =
  | { ok: true }
  | { ok: false; message: string };

export type AuthSessionTokens = {
  access_token: string;
  refresh_token: string;
  expires_at: number | null;
  token_type: string;
};

export type SignInActionResult =
  | { ok: true; session: AuthSessionTokens }
  | { ok: false; message: string };

export type SignUpActionResult =
  | { ok: true; hasSession: true; session: AuthSessionTokens }
  | { ok: true; hasSession: false; message: string }
  | { ok: false; message: string };

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  return "http://localhost:3000";
}

export async function signInWithPasswordAction(
  input: unknown,
): Promise<SignInActionResult> {
  const parsed = signInPasswordFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    return { ok: false, message: mapAuthError(error, "signInPassword") };
  }
  if (!data.session) {
    return { ok: false, message: "No session returned" };
  }
  return {
    ok: true,
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at ?? null,
      token_type: data.session.token_type,
    },
  };
}

export async function signUpWithPasswordAction(
  input: unknown,
): Promise<SignUpActionResult> {
  const parsed = signUpPasswordFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    return { ok: false, message: mapAuthError(error, "signUpPassword") };
  }
  if (data.session) {
    return {
      ok: true,
      hasSession: true,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at ?? null,
        token_type: data.session.token_type,
      },
    };
  }
  return { ok: true, hasSession: false, message: NO_SESSION_AFTER_SIGNUP };
}

export async function signOutAction(): Promise<AuthActionResult> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { ok: false, message: mapAuthError(error, "signOut") };
  }
  return { ok: true };
}

export async function forgotPasswordAction(
  input: unknown,
): Promise<AuthActionResult> {
  const parsed = forgotPasswordFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Enter a valid email",
    };
  }
  const supabase = await createServerSupabase();
  const origin = await siteOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${origin}/auth/callback?next=/auth/update-password`,
    },
  );
  if (error) {
    return { ok: false, message: mapAuthError(error, "forgotPassword") };
  }
  return { ok: true };
}

export async function updatePasswordAction(
  input: unknown,
): Promise<AuthActionResult> {
  const parsed = updatePasswordFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      message:
        "This link is invalid or expired. Request a new reset email.",
    };
  }
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return { ok: false, message: mapAuthError(error, "updatePassword") };
  }
  return { ok: true };
}

export async function hasPasswordUpdateSessionAction(): Promise<boolean> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user;
}
