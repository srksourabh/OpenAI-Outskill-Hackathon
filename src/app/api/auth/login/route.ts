import { NextResponse } from "next/server";
import { createSessionCookie, resolveLoginUser, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = String(body.email ?? "");
  const password = String(body.password ?? "");
  const user = resolveLoginUser(email, password);

  if (!user) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const sessionCookie = createSessionCookie(user);
  if (!sessionCookie) {
    return NextResponse.json({ error: "Session signing is not configured." }, { status: 503 });
  }

  const response = NextResponse.json({
    ok: true,
    user: {
      email: user.email,
      role: user.role,
      label: user.label
    }
  });
  response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  });
  return response;
}
