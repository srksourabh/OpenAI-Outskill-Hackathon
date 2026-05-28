import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getCampaignStats, simulateCallOutcomes } from "@/services/campaigns/engine";
import { updateCampaign } from "@/services/campaigns/file-store";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json().catch(() => ({ count: 8 }));
  const count = Number(body.count ?? 8);
  const campaign = await updateCampaign(id, (current) => simulateCallOutcomes(current, count));
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  return NextResponse.json({ campaign, stats: getCampaignStats(campaign) });
}
