import { randomUUID } from "node:crypto";
import { env } from "@/config/env";
import { isRetryEligible } from "@/domain/calls";
import { plivoAdapter } from "@/services/providers";
import type { CallRecord, Campaign } from "./types";
import { buildCallAgentSnapshot, buildStatusHistory } from "./engine";

export async function startCampaignLive(campaign: Campaign, contactIds?: string[]) {
  validateLiveCallingSetup();

  if (campaign.provider !== "plivo") {
    throw new Error(`Live calling is not configured for provider "${campaign.provider}".`);
  }

  const now = new Date().toISOString();
  const targetContactIds = new Set((contactIds?.length ? contactIds : campaign.contacts.map((contact) => contact.id)).filter((contactId) => campaign.contacts.some((contact) => contact.id === contactId)));
  const existingContactIds = new Set(campaign.calls.map((call) => call.contact_id));
  const nextCalls = [...campaign.calls];

  for (const contact of campaign.contacts) {
    if (!targetContactIds.has(contact.id) || existingContactIds.has(contact.id)) continue;

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
      confidence: 0,
      detected_language: contact.language_hint,
      recording_url: "",
      retry_eligible: false,
      last_call_time: null,
      provider_call_id: null,
      ...buildCallAgentSnapshot(campaign),
      status_history: buildStatusHistory("queued", now),
      updated_at: now
    });
  }

  if (nextCalls.length === campaign.calls.length) {
    return campaign;
  }

  const activeCount = nextCalls.filter((call) => ["initiated", "ringing", "answered"].includes(call.status)).length;
  let remainingStartSlots = Math.max(0, campaign.concurrency_limit - activeCount);
  const startedCalls = await Promise.all(
    nextCalls.map(async (call) => {
      if (call.status !== "queued" || remainingStartSlots <= 0) {
        return call;
      }
      remainingStartSlots -= 1;

      const contact = findContact(campaign, call.contact_id);
      const answerUrl = buildSignedCallbackUrl("/api/plivo/answer", call.id, {
        companyName: campaign.company_name,
        orderId: contact.order_id,
        location: contact.location,
        machineCount: String(contact.machine_count),
        languageHint: contact.language_hint,
        providerName: contact.provider_name,
        assetLabel: campaign.prompt_config.asset_label,
        referenceLabel: campaign.prompt_config.reference_label,
        accountLabel: campaign.prompt_config.account_label,
        accountName: campaign.prompt_config.account_name,
        voicePreset: call.voice_preset_snapshot,
        voiceId: call.voice_id_snapshot,
        tone: call.tone_snapshot,
        promptEnhancement: call.prompt_enhancement_snapshot,
        selfImproveEnabled: String(campaign.agent_settings.self_improve_enabled),
        selfImprovementNotes: campaign.self_improvement_notes
      });
      const ringUrl = buildSignedCallbackUrl("/api/plivo/ring", call.id);
      const hangupUrl = buildSignedCallbackUrl("/api/plivo/hangup", call.id);

      try {
        const response = await plivoAdapter.createCall({
          to: contact.phone,
          answerUrl,
          ringUrl,
          hangupUrl
        });

        return {
          ...call,
          status: "initiated",
          provider_call_id: response.provider_call_id,
          status_history: [...call.status_history, { status: "initiated", at: now, note: "Provider call created." }],
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
          status_history: [...call.status_history, { status: "failed", at: now, note: message }],
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
