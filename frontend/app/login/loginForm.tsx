"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function LoginForm() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="font-bold text-3xl sm:text-4xl text-primary">Ready to Focus?</p>
        <p className="text-muted-foreground mt-2">Auth is temporarily disabled</p>
      </div>
      <Button variant="filled" className="w-full" onClick={() => router.push("/")}>
        Go to Poomo
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <button
          type="button"
          onClick={() => router.push("/register")}
          className="text-primary font-semibold hover:underline underline-offset-2"
        >
          Register
        </button>
      </p>
    </div>
  );
}
