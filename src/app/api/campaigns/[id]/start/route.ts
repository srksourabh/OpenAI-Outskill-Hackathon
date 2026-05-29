import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { getCampaignStats, simulateCallOutcomes, startCampaign } from "@/services/campaigns/engine";
import { startCampaignLive } from "@/services/campaigns/live-start";
import { getCampaign, saveCampaign, updateCampaign } from "@/services/campaigns/file-store";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const { id } = await params;
    const existing = await getCampaign(id);
    if (!existing) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as { contact_ids?: string[] };
    const contactIds = Array.isArray(body.contact_ids) ? body.contact_ids.filter((value): value is string => typeof value === "string" && value.trim().length > 0) : undefined;

    if (existing.provider === "simulated") {
      const campaign = await updateCampaign(id, (current) => {
        const started = startCampaign(current, contactIds);
        return simulateCallOutcomes(started, { count: contactIds?.length ?? started.calls.length, contactIds });
      });
      if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      return NextResponse.json({ campaign, stats: getCampaignStats(campaign) });
    }

    const liveCampaign = await startCampaignLive(existing, contactIds);
    await saveCampaign(liveCampaign);

    return NextResponse.json({ campaign: liveCampaign, stats: getCampaignStats(liveCampaign) });
  } catch (error) {
    return jsonError(error);
  }
}
