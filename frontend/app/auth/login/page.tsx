"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  signInWithPasswordAction,
  signUpWithPasswordAction,
} from "@/lib/actions/auth";
import { useAuth } from "@/components/auth/SessionProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  signInPasswordFormSchema,
  signUpPasswordFormSchema,
} from "@/lib/auth/schemas";

type Tab = "signin" | "signup";

export default function AuthLoginPage() {
  const router = useRouter();
  const { refreshSession } = useAuth();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [pwError, setPwError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function clearErrors() {
    setPwError(null);
    setFieldErrors({});
  }

  function onSignInPassword(e: React.FormEvent) {
    e.preventDefault();
    clearErrors();
    const parsed = signInPasswordFormSchema.safeParse({ email, password });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !next[key]) next[key] = issue.message;
      }
      setFieldErrors(next);
      return;
    }
    startTransition(async () => {
      try {
        const result = await signInWithPasswordAction(parsed.data);
        if (!result.ok) {
          setPwError(result.message);
          return;
        }
        await refreshSession();
        router.push("/");
        router.refresh();
      } catch {
        setPwError("Something went wrong. Try again.");
      }
    });
  }

  function onSignUp(e: React.FormEvent) {
    e.preventDefault();
    clearErrors();
    const parsed = signUpPasswordFormSchema.safeParse({
      email,
      password,
      confirmPassword,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !next[key]) next[key] = issue.message;
      }
      setFieldErrors(next);
      return;
    }
    startTransition(async () => {
      try {
        const result = await signUpWithPasswordAction(parsed.data);
        if (!result.ok) {
          setPwError(result.message);
          return;
        }
        if (result.hasSession) {
          await refreshSession();
          router.push("/");
          router.refresh();
          return;
        }
        setPwError(result.message);
      } catch {
        setPwError("Something went wrong. Try again.");
      }
    });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm space-y-6 border-2 border-border rounded-xl p-6 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold">Poomo account</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in to sync your data across devices, or create a new account.
          </p>
        </div>

        <div className="flex rounded-lg border border-border p-0.5 bg-muted/40">
          <button
            type="button"
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              tab === "signin"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => {
              setTab("signin");
              clearErrors();
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              tab === "signup"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => {
              setTab("signup");
              clearErrors();
            }}
          >
            Create account
          </button>
        </div>

        {tab === "signin" ? (
          <form onSubmit={onSignInPassword} className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="auth-email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="auth-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {fieldErrors.email ? (
                <p className="text-sm text-destructive">{fieldErrors.email}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <label htmlFor="auth-password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="auth-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {fieldErrors.password ? (
                <p className="text-sm text-destructive">
                  {fieldErrors.password}
                </p>
              ) : null}
            </div>
            {pwError ? (
              <p className="text-sm text-destructive">{pwError}</p>
            ) : null}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </Button>
            <p className="text-center text-sm">
              <Link
                href="/auth/forgot-password"
                className="text-primary underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={onSignUp} className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="signup-email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="signup-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {fieldErrors.email ? (
                <p className="text-sm text-destructive">{fieldErrors.email}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <label htmlFor="signup-password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters, a letter and a number"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {fieldErrors.password ? (
                <p className="text-sm text-destructive">
                  {fieldErrors.password}
                </p>
              ) : null}
            </div>
            <div className="space-y-1">
              <label htmlFor="signup-confirm" className="text-sm font-medium">
                Confirm password
              </label>
              <Input
                id="signup-confirm"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {fieldErrors.confirmPassword ? (
                <p className="text-sm text-destructive">
                  {fieldErrors.confirmPassword}
                </p>
              ) : null}
            </div>
            {pwError ? (
              <p className="text-sm text-destructive">{pwError}</p>
            ) : null}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Creating…" : "Create account"}
            </Button>
          </form>
        )}

        <Button variant="ghost" asChild className="w-full">
          <Link href="/">Back to app</Link>
        </Button>
      </div>
    </div>
  );
}
