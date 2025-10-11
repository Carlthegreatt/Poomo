"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const loginSchema = z.object({
  email: z.string().email().trim(),
  password: z.string().min(8).trim(),
});

type LoginState = { errors?: Record<string, string[]> } | undefined;

async function createSupabaseServer() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing Supabase environment variables. Please check your Vercel environment variables."
    );
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}

export async function login(_prevState: LoginState, formData: FormData) {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseServer();
  const { email, password } = parsed.data;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { errors: { email: [error.message] } };
  }

  redirect("/");
}

export async function logout() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/");
}

export async function register() {
  redirect("/register");
}
