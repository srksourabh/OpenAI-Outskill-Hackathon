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

  const recordingUrl = payload.RecordUrl ?? payload.recording_url ?? "";
  const recordingDuration = payload.RecordingDuration ?? payload.recording_duration ?? "";
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
              recording_url: recordingUrl || call.recording_url,
              summary_text: recordingDuration
                ? `${call.summary_text || "Call updated."} Recording available (${recordingDuration}s).`
                : call.summary_text || "Recording available.",
              status_history: [...call.status_history, { status: call.status, at: now, note: "Recording callback received." }],
              updated_at: now
            }
          : call
      )
    }));
  }

  return NextResponse.json({ ok: true, recording_url: recordingUrl });
}
