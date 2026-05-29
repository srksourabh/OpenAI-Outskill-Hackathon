import { randomUUID } from "node:crypto";
import { isRetryEligible, type CallStatus } from "@/domain/calls";
import { getEffectiveLanguage } from "@/domain/languages";
import { getAgentSettings, getPromptConfig, type AgentSettingsInput, type AgentTone, type BehaviorQaStatus, type ReceiverAttitude } from "@/domain/voice-agent";
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
  agentSettings?: AgentSettingsInput;
};

type ReceiverAttitudeMatch = {
  attitude: ReceiverAttitude;
  confidence: number;
  signals: string[];
};

type BehaviorVerificationResult = {
  qa_language_status: BehaviorQaStatus;
  qa_tone_status: BehaviorQaStatus;
  qa_score: number;
  qa_notes: string;
};

type CallbackSchedule = {
  callback_requested_at: string | null;
  callback_remarks: string;
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
    agent_settings: getAgentSettings(input.agentSettings),
    self_improvement_notes: "",
    provider: input.provider ?? "simulated",
    status: "draft",
    default_language: getEffectiveLanguage(input.defaultLanguage, "hi"),
    retry_limit: 2,
    concurrency_limit: Math.max(1, Math.min(input.concurrencyLimit || 5, 25)),
    created_at: now,
    contacts,
    calls: [],
    call_events: []
  };
}

export function startCampaign(campaign: Campaign, contactIds?: string[]): Campaign {
  const now = new Date().toISOString();
  const targetContactIds = new Set((contactIds?.length ? contactIds : campaign.contacts.map((contact) => contact.id)).filter((contactId) => campaign.contacts.some((contact) => contact.id === contactId)));
  const existingContactIds = new Set(campaign.calls.map((call) => call.contact_id));
  const activeCount = campaign.calls.filter((call) => ["initiated", "ringing", "answered"].includes(call.status)).length;
  const initialAvailableSlots = Math.max(0, campaign.concurrency_limit - activeCount);
  const newCalls = campaign.contacts
    .filter((contact) => targetContactIds.has(contact.id) && !existingContactIds.has(contact.id))
    .map((contact, index): CallRecord => {
      const shouldStartNow = index < initialAvailableSlots;
      return {
      id: randomUUID(),
      campaign_id: campaign.id,
      contact_id: contact.id,
      status: shouldStartNow ? "ringing" : "queued",
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
      last_call_time: shouldStartNow ? now : null,
      provider_call_id: null,
      ...buildCallAgentSnapshot(campaign),
      status_history: buildStatusHistory(shouldStartNow ? "ringing" : "queued", now),
      updated_at: now
    };
    });

  if (newCalls.length === 0) {
    return campaign;
  }

  return {
    ...campaign,
    status: "running",
    calls: [...campaign.calls, ...newCalls]
  };
}

export function simulateCallOutcomes(
  campaign: Campaign,
  options: number | { count?: number; transcripts?: string[]; contactIds?: string[] } = campaign.calls.length
): Campaign {
  const count = typeof options === "number" ? options : options.count ?? campaign.calls.length;
  const transcripts = typeof options === "number" ? demoTranscripts : options.transcripts ?? demoTranscripts;
  const targetContactIds = new Set(typeof options === "number" ? campaign.calls.map((call) => call.contact_id) : options.contactIds?.length ? options.contactIds : campaign.calls.map((call) => call.contact_id));
  let completed = 0;
  const now = new Date().toISOString();
  const calls = campaign.calls.map((call, index) => {
    if (
      completed >= count ||
      !targetContactIds.has(call.contact_id) ||
      call.status === "completed" ||
      call.status === "invalid_number" ||
      call.status === "not_picked"
    ) {
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

    const transcript = transcripts[index % transcripts.length] ?? "";
    const outcome = classifyTranscript(transcript);
    const callbackSchedule = extractCallbackSchedule(transcript, now);
    const attitudeMatch = classifyReceiverAttitude(transcript);
    const qaResult = evaluateCallBehaviorQuality({
      transcriptText: transcript,
      expectedLanguage: call.detected_language,
      detectedLanguage: outcome.detected_language,
      tone: call.tone_snapshot,
      receiverAttitude: attitudeMatch.attitude
    });
    return {
      ...call,
      status: "completed",
      disposition: outcome.disposition,
      next_action: outcome.next_action,
      transcript_text: transcript,
      transcript_status: "simulated",
      summary_text: outcome.summary_text,
      reason_code: outcome.reason_code,
      confidence: outcome.confidence,
      detected_language: outcome.detected_language,
      recording_url: `https://recordings.example.com/${call.id}.mp3`,
      retry_eligible: isRetryEligible("completed", outcome.disposition),
      receiver_attitude: attitudeMatch.attitude,
      receiver_attitude_confidence: attitudeMatch.confidence,
      callback_requested_at: outcome.disposition === "follow_up_needed" ? callbackSchedule.callback_requested_at : null,
      callback_remarks: outcome.disposition === "follow_up_needed" ? callbackSchedule.callback_remarks : "",
      missed_call_note: "",
      improvement_note: campaign.agent_settings.self_improve_enabled ? buildImprovementNoteFromAttitude(attitudeMatch.attitude) : "",
      ...qaResult,
      status_history: [...call.status_history, { status: "completed", at: now, note: "Simulated callback completed." }],
      last_call_time: now,
      updated_at: now
    } satisfies CallRecord;
  });

  const activeCount = calls.filter((call) => call.status === "ringing" || call.status === "answered" || call.status === "initiated").length;
  let availableSlots = Math.max(0, campaign.concurrency_limit - activeCount);
  const refilled = calls.map((call) => {
    if (availableSlots <= 0 || call.status !== "queued") return call;
    availableSlots -= 1;
    return { ...call, status: "ringing", status_history: [...call.status_history, { status: "ringing", at: now, note: "Call slot opened." }], last_call_time: now, updated_at: now } satisfies CallRecord;
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
    confidence: 1,
    retry_eligible: isRetryEligible(status, disposition),
    receiver_attitude: "unknown",
    receiver_attitude_confidence: 0,
    callback_requested_at: null,
    callback_remarks: "",
    missed_call_note: status === "not_picked" || status === "not_connected" || status === "voicemail" ? summary : "",
    improvement_note: "",
    qa_language_status: "warn",
    qa_tone_status: "warn",
    qa_score: 55,
    qa_notes: "No transcript available for language/tone verification.",
    status_history: [...call.status_history, { status, at: now, note: summary }],
    last_call_time: now,
    updated_at: now
  };
}

export function mergeCampaignAgentSettings(campaign: Campaign, input: AgentSettingsInput & { default_language?: string }): Campaign {
  return {
    ...campaign,
    default_language: getEffectiveLanguage(input.default_language, campaign.default_language),
    agent_settings: getAgentSettings({
      ...campaign.agent_settings,
      ...input
    })
  };
}

export function mergeCampaignConfiguration(
  campaign: Campaign,
  input: {
    company_name?: string;
    default_language?: string;
    prompt_config?: Partial<Campaign["prompt_config"]> | null;
    agent_settings?: AgentSettingsInput;
  }
): Campaign {
  return {
    ...campaign,
    company_name: input.company_name?.trim() || campaign.company_name,
    default_language: getEffectiveLanguage(input.default_language, campaign.default_language),
    prompt_config: getPromptConfig({
      ...campaign.prompt_config,
      ...(input.prompt_config ?? {})
    }),
    agent_settings: getAgentSettings({
      ...campaign.agent_settings,
      ...(input.agent_settings ?? {})
    })
  };
}

export function buildCallAgentSnapshot(campaign: Pick<Campaign, "agent_settings">) {
  const settings = getAgentSettings(campaign.agent_settings);
  return {
    voice_preset_snapshot: settings.voice_preset,
    voice_id_snapshot: settings.voice_id,
    tone_snapshot: settings.tone,
    prompt_enhancement_snapshot: settings.prompt_enhancement,
    receiver_attitude: "unknown" as const,
    receiver_attitude_confidence: 0,
    qa_language_status: "warn" as const,
    qa_tone_status: "warn" as const,
    qa_score: 0,
    qa_notes: "Call has not produced transcript evidence yet.",
    callback_requested_at: null,
    callback_remarks: "",
    missed_call_note: "",
    improvement_note: ""
  };
}

export function buildStatusHistory(status: CallStatus, now: string) {
  if (status === "queued") return [{ status, at: now, note: "Call queued." }];
  return [
    { status: "queued" as const, at: now, note: "Call queued." },
    { status, at: now, note: "Call started." }
  ];
}

export function classifyReceiverAttitude(transcript: string): ReceiverAttitudeMatch {
  const normalized = transcript.toLowerCase();
  const rules: Array<{ attitude: ReceiverAttitude; regex: RegExp; confidence: number }> = [
    { attitude: "rude", regex: /(stop|angry|rude|don't call|do not call|shut up|nonsense)/, confidence: 0.92 },
    { attitude: "busy", regex: /(busy|later|callback|call back|kal|baad|meeting|driving)/, confidence: 0.88 },
    { attitude: "suspicious", regex: /(proof|fraud|scam|who are you|why calling|otp|fake)/, confidence: 0.86 },
    { attitude: "confused", regex: /(who|kaun|why|confused|samajh|what is this|not clear)/, confidence: 0.8 },
    { attitude: "polite", regex: /(please|thank you|dhanyavad|ji|kindly)/, confidence: 0.76 },
    { attitude: "cooperative", regex: /(thank|yes|haan|ready|sure|ok|proceed|confirm)/, confidence: 0.78 }
  ];

  for (const rule of rules) {
    const matches = normalized.match(rule.regex);
    if (!matches) continue;
    return { attitude: rule.attitude, confidence: rule.confidence, signals: matches };
  }

  return { attitude: "unknown", confidence: 0.35, signals: [] };
}

export function detectReceiverAttitude(transcript: string) {
  return classifyReceiverAttitude(transcript).attitude;
}

export function buildImprovementNote(transcript: string) {
  return buildImprovementNoteFromAttitude(detectReceiverAttitude(transcript));
}

export function buildImprovementNoteFromAttitude(attitude: ReceiverAttitude) {
  if (attitude === "busy") return "When receivers sound busy, ask for a callback time before repeating details.";
  if (attitude === "confused") return "When receivers sound confused, identify the company and reference once in simple words.";
  if (attitude === "rude") return "When receivers sound rude, keep the response calm and short.";
  if (attitude === "suspicious") return "When receivers sound suspicious, state company and reference clearly before asking readiness.";
  if (attitude === "polite") return "When receivers are polite, keep the script warm and efficient.";
  if (attitude === "cooperative") return "When receivers are cooperative, confirm readiness quickly and close cleanly.";
  return "Collect one clarifying question before closing when response intent is unclear.";
}

export function evaluateCallBehaviorQuality({
  transcriptText,
  expectedLanguage,
  detectedLanguage,
  tone,
  receiverAttitude
}: {
  transcriptText: string;
  expectedLanguage: string;
  detectedLanguage: string;
  tone: AgentTone;
  receiverAttitude: ReceiverAttitude;
}): BehaviorVerificationResult {
  const normalizedTranscript = transcriptText.trim().toLowerCase();
  if (!normalizedTranscript) {
    return {
      qa_language_status: "fail",
      qa_tone_status: "warn",
      qa_score: 35,
      qa_notes: "Transcript missing, unable to verify language adherence and tone quality."
    };
  }

  const expected = expectedLanguage.trim().toLowerCase();
  const detected = detectedLanguage.trim().toLowerCase();
  const languageStatus: BehaviorQaStatus = expected && detected ? (expected === detected ? "pass" : "fail") : "warn";

  let toneStatus: BehaviorQaStatus = "warn";
  if (receiverAttitude === "rude") {
    toneStatus = tone === "patient" || tone === "polite" || tone === "assertive_respectful" ? "pass" : "fail";
  } else if (receiverAttitude === "busy" || receiverAttitude === "confused" || receiverAttitude === "suspicious") {
    toneStatus = tone === "patient" || tone === "polite" || tone === "warm" ? "pass" : "warn";
  } else if (receiverAttitude === "cooperative" || receiverAttitude === "polite") {
    toneStatus = tone === "warm" || tone === "polite" || tone === "direct" ? "pass" : "warn";
  } else if (normalizedTranscript.length > 20) {
    toneStatus = "pass";
  }

  const languageScore = languageStatus === "pass" ? 55 : languageStatus === "warn" ? 35 : 20;
  const toneScore = toneStatus === "pass" ? 35 : toneStatus === "warn" ? 20 : 8;
  const evidenceScore = Math.min(10, Math.floor(normalizedTranscript.length / 40) + 2);
  const score = Math.max(0, Math.min(100, languageScore + toneScore + evidenceScore));
  const notes = [`Language check: ${languageStatus}`, `Tone check: ${toneStatus}`, `Receiver attitude: ${receiverAttitude}`].join(". ");

  return {
    qa_language_status: languageStatus,
    qa_tone_status: toneStatus,
    qa_score: score,
    qa_notes: `${notes}.`
  };
}

export function extractCallbackSchedule(transcript: string, nowIso = new Date().toISOString()): CallbackSchedule {
  const normalized = transcript.trim();
  if (!normalized) {
    return { callback_requested_at: null, callback_remarks: "" };
  }

  const lower = normalized.toLowerCase();
  const callbackRequested = /(call back|callback|later|tomorrow|kal|after|next week|follow up|follow-up|day after)/.test(lower);
  if (!callbackRequested) {
    return { callback_requested_at: null, callback_remarks: "" };
  }

  const base = new Date(nowIso);
  let scheduled = new Date(base);

  if (/day after tomorrow/.test(lower)) {
    scheduled.setUTCDate(scheduled.getUTCDate() + 2);
  } else if (/tomorrow|kal/.test(lower)) {
    scheduled.setUTCDate(scheduled.getUTCDate() + 1);
  } else if (/next week/.test(lower)) {
    scheduled.setUTCDate(scheduled.getUTCDate() + 7);
  }

  const afterDaysMatch = lower.match(/\b(?:after|in)\s+(\d+)\s+days?\b/);
  const numericDays = Number(afterDaysMatch?.[1] ?? NaN);
  if (Number.isFinite(numericDays) && numericDays > 0) {
    scheduled = new Date(base);
    scheduled.setUTCDate(scheduled.getUTCDate() + Math.min(30, numericDays));
  }

  const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (timeMatch) {
    const hours = Number(timeMatch[1] ?? 0);
    const minutes = Number(timeMatch[2] ?? 0);
    const meridiem = timeMatch[3];
    let hour24 = hours % 12;
    if (meridiem === "pm") hour24 += 12;
    scheduled.setUTCHours(hour24, minutes, 0, 0);
  } else {
    scheduled.setUTCHours(base.getUTCHours(), base.getUTCMinutes(), 0, 0);
  }

  return {
    callback_requested_at: scheduled.toISOString(),
    callback_remarks: normalized
  };
}
