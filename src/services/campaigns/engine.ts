import { randomUUID } from "node:crypto";
import { isRetryEligible } from "@/domain/calls";
import { getEffectiveLanguage } from "@/domain/languages";
import { getPromptConfig } from "@/domain/voice-agent";
import { classifyTranscript } from "@/services/ai/classifier";
import type { ParsedContact } from "@/services/ingestion/types";
import type { CallRecord, Campaign, CampaignStats, ContactRecord } from "./types";

type CreateCampaignInput = {
  name: string;
  companyName: string;
  defaultLanguage: string;
  concurrencyLimit: number;
  contacts: ParsedContact[];
  provider?: Campaign["provider"];
  promptConfig?: Campaign["prompt_config"];
};

const demoTranscripts = [
  "Haan, machine pickup ke liye ready hai.",
  "Yes, pickup is ready.",
  "Haan ready hai, engineer bhej dijiye.",
  "Nahi, abhi ready nahi hai. Kal call kijiye.",
  "Not ready yet, please follow up next week.",
  "",
  "Phone number invalid",
  "No answer",
  "Voicemail reached",
  "Maybe later, I am not sure."
];

export function createCampaignFromContacts(input: CreateCampaignInput): Campaign {
  const id = randomUUID();
  const now = new Date().toISOString();
  const contacts: ContactRecord[] = input.contacts.map((contact) => ({
    ...contact,
    id: randomUUID(),
    campaign_id: id,
    language_hint: getEffectiveLanguage(contact.language_hint, input.defaultLanguage)
  }));

  return {
    id,
    name: input.name,
    company_name: input.companyName,
    prompt_config: getPromptConfig(input.promptConfig),
    provider: input.provider ?? "simulated",
    status: "draft",
    default_language: getEffectiveLanguage(input.defaultLanguage, "hi"),
    retry_limit: 2,
    concurrency_limit: Math.max(1, Math.min(input.concurrencyLimit || 5, 25)),
    created_at: now,
    contacts,
    calls: []
  };
}

export function startCampaign(campaign: Campaign): Campaign {
  if (campaign.status === "running" && campaign.calls.length > 0) return campaign;
  const now = new Date().toISOString();
  const existingContactIds = new Set(campaign.calls.map((call) => call.contact_id));
  const newCalls = campaign.contacts
    .filter((contact) => !existingContactIds.has(contact.id))
    .map((contact, index): CallRecord => ({
      id: randomUUID(),
      campaign_id: campaign.id,
      contact_id: contact.id,
      status: index < campaign.concurrency_limit ? "ringing" : "queued",
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
      last_call_time: index < campaign.concurrency_limit ? now : null,
      provider_call_id: null,
      updated_at: now
    }));

  return {
    ...campaign,
    status: "running",
    calls: [...campaign.calls, ...newCalls]
  };
}

export function simulateCallOutcomes(campaign: Campaign, count = campaign.calls.length): Campaign {
  let completed = 0;
  const now = new Date().toISOString();
  const calls = campaign.calls.map((call, index) => {
    if (completed >= count || call.status === "completed" || call.status === "invalid_number" || call.status === "not_picked") {
      return call;
    }

    completed += 1;
    if (index === 5) {
      return finishTerminal(call, "invalid_number", "invalid_number", "verify_data", "Invalid number detected by provider.", now);
    }
    if (index === 6) {
      return finishTerminal(call, "not_picked", "not_picked", "retry", "Recipient did not answer.", now);
    }
    if (index === 8) {
      return finishTerminal(call, "voicemail", "voicemail", "retry", "Reached voicemail.", now);
    }

    const transcript = demoTranscripts[index % demoTranscripts.length];
    const outcome = classifyTranscript(transcript);
    return {
      ...call,
      status: "completed",
      disposition: outcome.disposition,
      next_action: outcome.next_action,
      transcript_text: transcript,
      transcript_status: "simulated",
      summary_text: outcome.summary_text,
      reason_code: outcome.reason_code,
      detected_language: outcome.detected_language,
      recording_url: `https://recordings.example.com/${call.id}.mp3`,
      retry_eligible: isRetryEligible("completed", outcome.disposition),
      last_call_time: now,
      updated_at: now
    } satisfies CallRecord;
  });

  const activeCount = calls.filter((call) => call.status === "ringing" || call.status === "answered" || call.status === "initiated").length;
  let availableSlots = Math.max(0, campaign.concurrency_limit - activeCount);
  const refilled = calls.map((call) => {
    if (availableSlots <= 0 || call.status !== "queued") return call;
    availableSlots -= 1;
    return { ...call, status: "ringing", last_call_time: now, updated_at: now } satisfies CallRecord;
  });

  return {
    ...campaign,
    status: refilled.every((call) => call.status !== "queued" && call.status !== "ringing") ? "completed" : "running",
    calls: refilled
  };
}

export function getCampaignStats(campaign: Campaign): CampaignStats {
  return {
    totalContacts: campaign.contacts.length,
    queued: campaign.calls.filter((call) => call.status === "queued").length,
    active: campaign.calls.filter((call) => ["initiated", "ringing", "answered"].includes(call.status)).length,
    completed: campaign.calls.filter((call) => call.status === "completed").length,
    confirmedPickup: campaign.calls.filter((call) => call.disposition === "confirmed_pickup").length,
    followUpNeeded: campaign.calls.filter((call) => call.disposition === "follow_up_needed" || call.disposition === "declined").length,
    manualReview: campaign.calls.filter((call) => call.disposition === "manual_review").length,
    invalidNumbers: campaign.calls.filter((call) => call.status === "invalid_number" || call.disposition === "invalid_number").length,
    retryEligible: campaign.calls.filter((call) => call.retry_eligible).length
  };
}

function finishTerminal(
  call: CallRecord,
  status: CallRecord["status"],
  disposition: CallRecord["disposition"],
  nextAction: CallRecord["next_action"],
  summary: string,
  now: string
): CallRecord {
  return {
    ...call,
    status,
    disposition,
    next_action: nextAction,
    summary_text: summary,
    transcript_status: "simulated",
    retry_eligible: isRetryEligible(status, disposition),
    last_call_time: now,
    updated_at: now
  };
}
