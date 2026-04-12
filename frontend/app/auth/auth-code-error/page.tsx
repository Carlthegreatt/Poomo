import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-4">
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        The sign-in link is invalid or has expired. Request a new one from the
        login page.
      </p>
      <Button asChild>
        <Link href="/auth/login">Try again</Link>
      </Button>
    </div>
  );
}
