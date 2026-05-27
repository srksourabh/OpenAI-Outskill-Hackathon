import { NextResponse } from "next/server";
import { listCampaigns } from "@/services/campaigns/file-store";

export const runtime = "nodejs";

export async function GET() {
  const campaigns = await listCampaigns();
  return NextResponse.json({ campaigns });
}
