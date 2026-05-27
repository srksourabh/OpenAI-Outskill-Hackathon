import { randomUUID } from "node:crypto";
import { env } from "@/config/env";
import { isRetryEligible } from "@/domain/calls";
import { createPlivoCall, getProviderCallId } from "@/services/plivo/client";
import type { CallRecord, Campaign } from "./types";

export async function startCampaignLive(campaign: Campaign) {
  validateLiveCallingSetup();

  if (campaign.provider !== "plivo") {
    throw new Error(`Live calling is not configured for provider "${campaign.provider}".`);
  }

  if (campaign.status === "running" && campaign.calls.length > 0) {
    return campaign;
  }

  const now = new Date().toISOString();
  const existingContactIds = new Set(campaign.calls.map((call) => call.contact_id));
  const nextCalls = [...campaign.calls];

  for (const contact of campaign.contacts) {
    if (existingContactIds.has(contact.id)) continue;

    nextCalls.push({
      id: randomUUID(),
      campaign_id: campaign.id,
      contact_id: contact.id,
      status: "queued",
      disposition: "unknown",
      next_action: "none",
      attempt_number: 1,
      transcript_text: "",
      transcript_status: "missing",
      summary_text: "",
      reason_code: null,
      detected_language: contact.language_hint,
      recording_url: "",
      retry_eligible: false,
      last_call_time: null,
      provider_call_id: null,
      updated_at: now
    });
  }

  const startedCalls = await Promise.all(
    nextCalls.map(async (call, index) => {
      if (call.status !== "queued" || index >= campaign.concurrency_limit) {
        return call;
      }

      const contact = findContact(campaign, call.contact_id);
      const answerUrl = buildSignedCallbackUrl("/api/plivo/answer", call.id, {
        companyName: campaign.company_name,
        orderId: contact.order_id,
        location: contact.location,
        machineCount: String(contact.machine_count),
        languageHint: contact.language_hint,
        providerName: contact.provider_name
      });
      const ringUrl = buildSignedCallbackUrl("/api/plivo/ring", call.id);
      const hangupUrl = buildSignedCallbackUrl("/api/plivo/hangup", call.id);

      try {
        const response = await createPlivoCall({
          to: contact.phone,
          answerUrl,
          ringUrl,
          hangupUrl
        });

        return {
          ...call,
          status: "initiated",
          provider_call_id: getProviderCallId(response),
          last_call_time: now,
          updated_at: now
        } satisfies CallRecord;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create provider call.";

        return {
          ...call,
          status: "failed",
          summary_text: message,
          retry_eligible: isRetryEligible("failed", "unknown"),
          last_call_time: now,
          updated_at: now
        } satisfies CallRecord;
      }
    })
  );

  return {
    ...campaign,
    status: "running",
    calls: startedCalls
  } satisfies Campaign;
}

function validateLiveCallingSetup() {
  const issues: string[] = [];

  if (!env.plivoAuthId || !env.plivoAuthToken || !env.plivoNumber) {
    issues.push("missing Plivo credentials");
  }

  if (isLocalUrl(env.appBaseUrl)) {
    issues.push("APP_BASE_URL must be a public URL, not localhost");
  }

  if (env.voiceBridgePublicWsUrl.includes("replace-with-voice-bridge-host")) {
    issues.push("VOICE_BRIDGE_PUBLIC_WS_URL is still a placeholder");
  }

  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith("replace-with")) {
    issues.push("OPENAI_API_KEY is missing for the voice bridge");
  }

  if (issues.length > 0) {
    throw new Error(`Live outbound calling is not ready: ${issues.join("; ")}.`);
  }
}

function isLocalUrl(value: string) {
  return /localhost|127\.0\.0\.1/i.test(value);
}

function findContact(campaign: Campaign, contactId: string) {
  const contact = campaign.contacts.find((item) => item.id === contactId);
  if (!contact) {
    throw new Error(`Contact ${contactId} was not found.`);
  }
  return contact;
}

function buildSignedCallbackUrl(path: string, callId: string, extra: Record<string, string> = {}) {
  const url = new URL(path, env.appBaseUrl);
  url.searchParams.set("callId", callId);

  if (env.plivoWebhookSecret && !env.plivoWebhookSecret.startsWith("replace-with")) {
    url.searchParams.set("secret", env.plivoWebhookSecret);
  }

  for (const [key, value] of Object.entries(extra)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}
