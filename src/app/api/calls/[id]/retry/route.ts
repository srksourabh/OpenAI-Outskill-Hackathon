import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getCampaignStats } from "@/services/campaigns/engine";
import { getCampaign, saveCampaign } from "@/services/campaigns/file-store";
import { retryCallInCampaign } from "@/services/campaigns/retry";
import { listCampaigns } from "@/services/campaigns/file-store";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const campaigns = await listCampaigns();
  const campaignSummary = campaigns.find((item) => item.calls.some((call) => call.id === id));
  if (!campaignSummary) return NextResponse.json({ error: "Call not found" }, { status: 404 });

  const campaign = await getCampaign(campaignSummary.id);
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const updated = retryCallInCampaign(campaign, id);
  await saveCampaign(updated);
  return NextResponse.json({ campaign: updated, stats: getCampaignStats(updated) });
}
