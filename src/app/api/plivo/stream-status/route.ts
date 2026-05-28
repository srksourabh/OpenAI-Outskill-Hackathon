import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { canApplyProviderEvent, createCallEvent, hasProviderEvent } from "@/services/campaigns/audit";
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
    const event = createCallEvent({
      campaignId: campaign.id,
      callId,
      provider: "plivo",
      eventType: "stream-status",
      providerEventId: payload.EventUUID ?? payload.event_uuid ?? streamId ?? null,
      payload
    });
    await updateCampaign(campaign.id, (current) => ({
      ...current,
      call_events: hasProviderEvent(current, event) ? current.call_events : [...current.call_events, event],
      calls: current.calls.map((call) =>
        call.id === callId && !hasProviderEvent(current, event) && canApplyProviderEvent(call, "answered")
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
