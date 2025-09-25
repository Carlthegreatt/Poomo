"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";

const loginSchema = z.object({
  email: z.string().email().trim(),
  password: z.string().min(8).trim(),
});

type LoginState = { errors?: Record<string, string[]> } | undefined;

export async function login(_prevState: LoginState, formData: FormData) {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const supabase = createServerActionClient({ cookies });
  const { email, password } = parsed.data;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { errors: { email: [error.message] } };
  }

  redirect("/");
}

export async function logout() {
  const supabase = createServerActionClient({ cookies });
  await supabase.auth.signOut({ scope: "global" });
  redirect("/");
}

export async function register() {
  redirect("/register");
}
