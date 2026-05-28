import { NextResponse } from "next/server";
import { resolveTestUser, SESSION_COOKIE_NAME } from "@/lib/session";

const ONE_DAY_SECONDS = 60 * 60 * 24;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = String(body.email ?? "");
  const password = String(body.password ?? "");
  const user = resolveTestUser(email, password);

  if (!user) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const response = NextResponse.json({
    ok: true,
    user: {
      email: user.email,
      role: user.role,
      label: user.label
    }
  });
  response.cookies.set(SESSION_COOKIE_NAME, user.role, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_DAY_SECONDS
  });
  return response;
}
