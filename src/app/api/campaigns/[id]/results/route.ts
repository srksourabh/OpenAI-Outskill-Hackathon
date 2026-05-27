import { NextResponse } from "next/server";
import { getCampaignStats } from "@/services/campaigns/engine";
import { getCampaign } from "@/services/campaigns/file-store";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  const rows = campaign.contacts.map((contact) => ({
    ...contact.source_row_data,
    contact_id: contact.id,
    provider_name: contact.provider_name,
    phone: contact.phone,
    location: contact.location,
    machine_count: contact.machine_count,
    order_id: contact.order_id,
    language_hint: contact.language_hint,
    call: campaign.calls.find((call) => call.contact_id === contact.id) ?? null
  }));
  return NextResponse.json({ campaign_id: campaign.id, stats: getCampaignStats(campaign), rows });
}
