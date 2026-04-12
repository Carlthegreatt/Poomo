import type { AuthError } from "@supabase/supabase-js";

export type AuthErrorContext =
  | "signInPassword"
  | "signUpPassword"
  | "forgotPassword"
  | "updatePassword"
  | "signOut";

/** Map Supabase auth errors to short, user-facing messages. */
export function mapAuthError(
  error: AuthError | null | undefined,
  context: AuthErrorContext,
): string {
  if (!error?.message) {
    return "Something went wrong. Try again.";
  }

  const msg = error.message.toLowerCase();

  switch (context) {
    case "signInPassword":
      if (
        msg.includes("invalid login credentials") ||
        msg.includes("invalid credentials")
      ) {
        return "Could not sign in. Check your email and password.";
      }
      if (msg.includes("email not confirmed")) {
        return "Confirm your email before signing in, or ask an admin to disable email confirmation for password sign-in.";
      }
      return "Could not sign in. Try again.";

    case "signUpPassword":
      if (msg.includes("already registered") || msg.includes("user already")) {
        return "An account with this email already exists. Sign in instead.";
      }
      if (msg.includes("password")) {
        return error.message;
      }
      return "Could not create your account. Try again.";

    case "forgotPassword":
      if (msg.includes("rate limit") || msg.includes("too many")) {
        return "Too many requests. Wait a bit and try again.";
      }
      return "Could not send reset instructions. Try again.";

    case "updatePassword":
      if (msg.includes("session") || msg.includes("jwt")) {
        return "This link is invalid or expired. Request a new reset email.";
      }
      return "Could not update your password. Try again.";

    case "signOut":
      return "Could not sign out. Try again.";

    default:
      return "Something went wrong. Try again.";
  }
}
