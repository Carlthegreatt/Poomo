import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const rawSessionSecret = process.env.SESSION_SECRET;
if (!rawSessionSecret || rawSessionSecret.length === 0) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET is required and cannot be empty in production."
    );
  }
}
const encodedKey = new TextEncoder().encode(
  rawSessionSecret || "dev-session-secret"
);

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await encrypt({ userId, expiresAt });

  const cookieStore = await cookies();
  cookieStore.set("session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
    sameSite: "lax",
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

type SessionPayload = {
  userId: string;
  expiresAt: Date;
};

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

export async function decrypt(session: string | undefined = "") {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch {
    console.log("Failed to verify session / Logged out");
  }
}
