import { NextResponse } from "next/server";
import { env } from "@/config/env";

export function requireAdmin(request: Request) {
  const configuredKey = process.env.ADMIN_API_KEY;
  if (!configuredKey || configuredKey.startsWith("replace-with")) return null;

  const suppliedKey = request.headers.get("x-admin-key");
  if (suppliedKey === configuredKey) return null;

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function requireCron(request: Request) {
  const url = new URL(request.url);
  const supplied = request.headers.get("authorization")?.replace("Bearer ", "") ?? url.searchParams.get("secret");
  if (supplied === env.cronSecret) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
