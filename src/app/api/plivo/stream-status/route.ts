import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { listCampaigns, updateCampaign } from "@/services/campaigns/file-store";
import { isAuthorizedPlivoWebhook, parsePlivoWebhookRequest } from "@/services/plivo/webhooks";

export async function POST(request: Request) {
  const { url, payload } = await parsePlivoWebhookRequest(request);
  if (!isAuthorizedPlivoWebhook(url, env.plivoWebhookSecret ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const callId = url.searchParams.get("callId");
  if (!callId) {
    return NextResponse.json({ error: "Missing callId" }, { status: 400 });
  }

  const streamEvent = payload.Event ?? payload.event ?? payload.StreamEvent ?? payload.stream_event ?? "stream-event";
  const streamId = payload.StreamID ?? payload.stream_id ?? payload.StreamId ?? payload.streamId ?? "";
  const remark = streamId
    ? `Audio stream ${streamEvent} (${streamId}).`
    : `Audio stream ${streamEvent}.`;

  const campaigns = await listCampaigns();
  for (const campaign of campaigns) {
    if (!campaign.calls.some((call) => call.id === callId)) continue;
    await updateCampaign(campaign.id, (current) => ({
      ...current,
      calls: current.calls.map((call) =>
        call.id === callId
          ? {
              ...call,
              status: call.status === "initiated" || call.status === "ringing" ? "answered" : call.status,
              summary_text: call.summary_text ? `${call.summary_text} ${remark}` : remark,
              updated_at: new Date().toISOString()
            }
          : call
      )
    }));
  }

  return NextResponse.json({ ok: true });
}
