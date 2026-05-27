import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));
  return NextResponse.json({ ok: true, received: "plivo-recording", payload });
}
