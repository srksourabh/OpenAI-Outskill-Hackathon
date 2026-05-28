import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { listCampaigns, updateCampaign } from "@/services/campaigns/file-store";
import { mapPlivoHangup, isAuthorizedPlivoWebhook, parsePlivoWebhookRequest } from "@/services/plivo/webhooks";

export async function POST(request: Request) {
  const { url, payload } = await parsePlivoWebhookRequest(request);
  if (!isAuthorizedPlivoWebhook(url, env.plivoWebhookSecret ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const callId = url.searchParams.get("callId");
  if (!callId) {
    return NextResponse.json({ error: "Missing callId" }, { status: 400 });
  }

  const mapped = mapPlivoHangup(payload);
  const now = new Date().toISOString();

  const campaigns = await listCampaigns();
  for (const campaign of campaigns) {
    if (!campaign.calls.some((call) => call.id === callId)) continue;
    await updateCampaign(campaign.id, (current) => ({
      ...current,
      calls: current.calls.map((call) => {
        if (call.id !== callId) return call;

        if (call.transcript_status === "realtime" && call.disposition !== "unknown") {
          return {
            ...call,
            status: call.status === "answered" ? "completed" : call.status,
            status_history: [...call.status_history, { status: call.status === "answered" ? "completed" : call.status, at: now, note: "Provider hangup received after realtime outcome." }],
            updated_at: now
          };
        }

        return {
          ...call,
          status: mapped.status,
          disposition: mapped.disposition,
          next_action: mapped.nextAction,
          summary_text: call.summary_text ? `${call.summary_text} ${mapped.summary}` : mapped.summary,
          retry_eligible: mapped.status === "not_picked" || mapped.status === "not_connected",
          status_history: [...call.status_history, { status: mapped.status, at: now, note: mapped.summary }],
          updated_at: now
        };
      })
    }));
  }

  return NextResponse.json({ ok: true, status: mapped.status, disposition: mapped.disposition });
}
