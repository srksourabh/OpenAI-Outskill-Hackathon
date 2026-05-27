import { NextResponse } from "next/server";
import { requireCron } from "@/lib/auth";

export async function GET(request: Request) {
  const authError = requireCron(request);
  if (authError) return authError;
  return NextResponse.json({ ok: true, reconciled: 0, mode: "mvp-placeholder" });
}
