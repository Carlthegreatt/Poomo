"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FaGoogle } from "react-icons/fa";
import { FaGithub } from "react-icons/fa";

export default function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      return;
    }

    router.push("/"); // go where you want after login
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        queryParams: {
          prompt: "select_account",
        },
      },
    });
    if (error) {
      console.error(error.message);
    } else {
      console.log("Redirecting to Google login…");
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="my-3 flex-col items-center justify-center">
          <p className="font-bold text-5xl my-5">Ready to Focus?</p>
        </div>
        <div className="mb-8 items-center justify-center flex">
          <p className="text-neutral-700">Login to your Account</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="Email"
            required
            autoComplete="email"
          />
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Password"
            required
            autoComplete="current-password"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full">
            Login
          </Button>
        </form>
        <div className="text-sm text-muted-foreground">
          <div className="w-full max-w-sm mx-auto">
            <div className="flex items-center justify-center mt-5 space-x-1">
              <span>Or login with:</span>
            </div>
            <div className="flex mt-5 items-center justify-center space-x-1">
              <Button
                variant="outline"
                className="w-1/2"
                onClick={signInWithGoogle}
              >
                <FaGoogle className="size-5" /> Google
              </Button>
              <Button variant="outline" className="w-1/2">
                <FaGithub className="size-5" /> Github
              </Button>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-center space-x-2">
            <span>
              Dont have an account?{" "}
              <Button variant="ghost" onClick={() => router.push("/register")}>
                Register
              </Button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
