import { env } from "@/config/env";
import { NextResponse } from "next/server";
import { buildPlivoStreamXml } from "@/services/plivo/xml";
import { isAuthorizedPlivoWebhook } from "@/services/plivo/webhooks";
import { listCampaigns, updateCampaign } from "@/services/campaigns/file-store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const callId = url.searchParams.get("callId");
  if (!callId) return new Response("Missing callId", { status: 400 });
  if (!isAuthorizedPlivoWebhook(url, env.plivoWebhookSecret ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await markCallAnswered(callId);

  const wsUrl = new URL(env.voiceBridgePublicWsUrl);
  wsUrl.searchParams.set("callId", callId);
  copyIfPresent(url, wsUrl, "companyName");
  copyIfPresent(url, wsUrl, "orderId");
  copyIfPresent(url, wsUrl, "location");
  copyIfPresent(url, wsUrl, "address");
  copyIfPresent(url, wsUrl, "machineCount");
  copyIfPresent(url, wsUrl, "languageHint");
  copyIfPresent(url, wsUrl, "providerName");
  copyIfPresent(url, wsUrl, "callPurpose");
  copyIfPresent(url, wsUrl, "requestType");
  copyIfPresent(url, wsUrl, "assetLabel");
  copyIfPresent(url, wsUrl, "referenceLabel");
  copyIfPresent(url, wsUrl, "addressLabel");
  copyIfPresent(url, wsUrl, "confirmationPoints");
  copyIfPresent(url, wsUrl, "collectionPoints");
  copyIfPresent(url, wsUrl, "voicePreset");
  copyIfPresent(url, wsUrl, "voiceId");
  copyIfPresent(url, wsUrl, "tone");
  copyIfPresent(url, wsUrl, "promptEnhancement");
  copyIfPresent(url, wsUrl, "selfImproveEnabled");
  copyIfPresent(url, wsUrl, "selfImprovementNotes");
  const xml = buildPlivoStreamXml({
    wsUrl: wsUrl.toString(),
    statusCallbackUrl: buildSignedCallbackUrl("/api/plivo/stream-status", callId),
    recordingCallbackUrl: buildSignedCallbackUrl("/api/plivo/recording", callId)
  });

  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
}

function copyIfPresent(source: URL, destination: URL, key: string) {
  const value = source.searchParams.get(key);
  if (value) {
    destination.searchParams.set(key, value);
  }
}

function buildSignedCallbackUrl(path: string, callId: string) {
  const callbackUrl = new URL(path, env.appBaseUrl);
  callbackUrl.searchParams.set("callId", callId);

  if (env.plivoWebhookSecret && !env.plivoWebhookSecret.startsWith("replace-with")) {
    callbackUrl.searchParams.set("secret", env.plivoWebhookSecret);
  }

  return callbackUrl.toString();
}

async function markCallAnswered(callId: string) {
  const campaigns = await listCampaigns();
  for (const campaign of campaigns) {
    if (!campaign.calls.some((call) => call.id === callId)) continue;
    await updateCampaign(campaign.id, (current) => ({
      ...current,
      calls: current.calls.map((call) =>
        call.id === callId
          ? {
              ...call,
              status: "answered",
              summary_text: call.summary_text || "Call answered. Voice agent connected.",
              status_history: [...call.status_history, { status: "answered", at: new Date().toISOString(), note: "Call answered. Voice agent connected." }],
              updated_at: new Date().toISOString()
            }
          : call
      )
    }));
  }
}
