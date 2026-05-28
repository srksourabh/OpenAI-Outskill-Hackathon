import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { listCampaigns, updateCampaign } from "@/services/campaigns/file-store";
import { isAuthorizedPlivoWebhook, parsePlivoWebhookRequest } from "@/services/plivo/webhooks";

export async function POST(request: Request) {
  const { url } = await parsePlivoWebhookRequest(request);
  if (!isAuthorizedPlivoWebhook(url, env.plivoWebhookSecret ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const callId = url.searchParams.get("callId");
  if (!callId) {
    return NextResponse.json({ error: "Missing callId" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const campaigns = await listCampaigns();
  for (const campaign of campaigns) {
    if (!campaign.calls.some((call) => call.id === callId)) continue;
    await updateCampaign(campaign.id, (current) => ({
      ...current,
      calls: current.calls.map((call) =>
        call.id === callId
          ? {
              ...call,
              status: "ringing",
              summary_text: "The receiver's line is ringing.",
              status_history: [...call.status_history, { status: "ringing", at: now, note: "Provider reported ringing." }],
              last_call_time: call.last_call_time ?? now,
              updated_at: now
            }
          : call
      )
    }));
  }

  return NextResponse.json({ ok: true });
}
