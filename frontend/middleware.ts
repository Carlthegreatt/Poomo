import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const protectedRoutes = ["/dashboard"];
const publicRoutes = ["/login", "/register"];

export default async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Check if environment variables are available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase environment variables in middleware");
    return res;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  // Ensure we load/refresh the session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const path = req.nextUrl.pathname;
  const isProtected = protectedRoutes.includes(path);
  const isPublic = publicRoutes.includes(path);

  if (isProtected && !session?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isPublic && session?.user) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return res;
}
