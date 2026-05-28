import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { getSessionRole } from "@/lib/session";

export async function requireAdmin(request: Request) {
  const configuredKey = env.adminApiKey;
  const role = await getSessionRole();
  if (role === "admin") return null;

  if (!configuredKey || configuredKey.startsWith("replace-with")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
