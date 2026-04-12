"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  hasPasswordUpdateSessionAction,
  updatePasswordAction,
} from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updatePasswordFormSchema } from "@/lib/auth/schemas";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await hasPasswordUpdateSessionAction();
      if (cancelled) return;
      setHasSession(ok);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const parsed = updatePasswordFormSchema.safeParse({
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
        const result = await updatePasswordAction(parsed.data);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        router.push("/");
        router.refresh();
      } catch {
        setError("Something went wrong. Try again.");
      }
    });
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm space-y-4 border-2 border-border rounded-xl p-6 shadow-sm text-center">
          <p className="text-sm text-muted-foreground">
            Open the reset link from your email on this device, or request a new reset from the forgot password page.
          </p>
          <Button asChild className="w-full">
            <Link href="/auth/forgot-password">Request reset link</Link>
          </Button>
          <Button variant="ghost" asChild className="w-full">
            <Link href="/auth/login">Back to sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm space-y-6 border-2 border-border rounded-xl p-6 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold">Choose a new password</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter and confirm your new password.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="new-password" className="text-sm font-medium">
              New password
            </label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters, a letter and a number"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {fieldErrors.password ? (
              <p className="text-sm text-destructive">{fieldErrors.password}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <label htmlFor="confirm-new-password" className="text-sm font-medium">
              Confirm password
            </label>
            <Input
              id="confirm-new-password"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {fieldErrors.confirmPassword ? (
              <p className="text-sm text-destructive">{fieldErrors.confirmPassword}</p>
            ) : null}
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Saving…" : "Update password"}
          </Button>
        </form>
        <Button variant="ghost" asChild className="w-full">
          <Link href="/">Back to app</Link>
        </Button>
      </div>
    </div>
  );
}
