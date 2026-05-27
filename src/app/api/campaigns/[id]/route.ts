import { NextResponse } from "next/server";
import { getCampaign } from "@/services/campaigns/file-store";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  return NextResponse.json({ campaign });
}
