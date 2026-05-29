import type { PromptConfig } from "@/services/campaigns/types";
import { z } from "zod";

export const voicePresets = ["indian_female_natural", "indian_male_natural", "openai_custom"] as const;
export type VoicePreset = (typeof voicePresets)[number];

export const agentTones = ["polite", "warm", "direct", "patient", "assertive_respectful"] as const;
export type AgentTone = (typeof agentTones)[number];

export const receiverAttitudes = ["unknown", "rude", "polite", "busy", "confused", "cooperative", "suspicious"] as const;
export type ReceiverAttitude = (typeof receiverAttitudes)[number];

export const behaviorQaStatuses = ["pass", "warn", "fail"] as const;
export type BehaviorQaStatus = (typeof behaviorQaStatuses)[number];

export type AgentSettings = {
  voice_preset: VoicePreset;
  voice_id: string;
  tone: AgentTone;
  prompt_enhancement: string;
  self_improve_enabled: boolean;
};

export type AgentSettingsInput = {
  voice_preset?: unknown;
  voice_id?: unknown;
  tone?: unknown;
  prompt_enhancement?: unknown;
  self_improve_enabled?: unknown;
} | null;

export type RealtimeVoice = string | { id: string };

export const callOutcomeSchema = z.object({
  disposition: z.enum(["confirmed_pickup", "declined", "follow_up_needed", "manual_review", "voicemail", "not_picked", "not_connected", "invalid_number"]),
  next_action: z.enum(["none", "retry", "send_engineer", "manual_followup", "verify_data"]),
  detected_language: z.string().min(2),
  summary_text: z.string().min(1),
  reason_code: z.string().nullable(),
  confidence: z.number().min(0).max(1)
});

export type CallOutcome = z.infer<typeof callOutcomeSchema>;

export type VoiceAgentContext = {
  companyName: string;
  orderId: string;
  location: string;
  address: string;
  machineCount: number;
  languageHint: string;
  contactName?: string;
  promptConfig?: Partial<PromptConfig>;
  agentSettings?: AgentSettingsInput;
  selfImprovementNotes?: string;
};

export type VoiceAgentStage = "opening" | "readiness_question" | "follow_up" | "closing";

export type PromptStudioPreviewInput = {
  companyName: string;
  defaultLanguage: string;
  promptConfig?: Partial<PromptConfig> | null;
  agentSettings?: AgentSettingsInput;
  selfImprovementNotes?: string;
};

const defaultConfirmationPoints = [
  "Confirm the merchant or store name",
  "Confirm the service address or branch location",
  "Confirm the device or request reference",
  "Confirm whether the request can proceed now"
];

const defaultCollectionPoints = [
  "Readiness confirmation or current status",
  "Reason for delay or blocker if not ready",
  "Preferred callback time if follow-up is needed",
  "Any address correction or landmark note"
];

export function buildVoiceAgentInstructions(
  context: VoiceAgentContext,
  options: {
    stage?: VoiceAgentStage;
    selectedLanguage?: string;
    supportedLanguages?: string[];
    responseGoal?: string;
    latestReceiverReply?: string;
    agentSettings?: AgentSettingsInput;
    selfImprovementNotes?: string;
  } = {}
) {
  const stage = options.stage ?? "opening";
  const selectedLanguage = options.selectedLanguage ?? context.languageHint;
  const supportedLanguages = options.supportedLanguages?.join(", ") ?? "en, hi, bn, pa, gu, mr, ta, te, ml, kn, or, as";
  const promptConfig = getPromptConfig(context.promptConfig);
  const agentSettings = getAgentSettings(options.agentSettings ?? context.agentSettings);
  const promptEnhancement = agentSettings.prompt_enhancement.trim();
  const selfImprovementNotes = (options.selfImprovementNotes ?? context.selfImprovementNotes ?? "").trim();
  const confirmationChecklist = formatChecklistForPrompt(promptConfig.confirmation_points);
  const collectionChecklist = formatChecklistForPrompt(promptConfig.collection_points);

  return [
    "You are a warm, concise AI calling assistant for an operations team in India.",
    "Speak in hyper realistic natural mode with an Indian operations-caller accent. Use small sentences, natural pacing, light conversational glue, and respectful phrasing.",
    "Vary the introduction wording across calls while preserving the required meaning.",
    "Do not repeat the same sentence when the receiver is confused, rude, or interrupting.",
    "Stop speaking when the receiver interrupts, listen, and then continue with the shortest useful response.",
    "Detect the receiver attitude as rude, polite, busy, confused, cooperative, suspicious, or unknown, then adapt calmly.",
    "If the receiver is rude, stay calm and brief. If busy, ask for a better callback time. If confused, explain the company and purpose once. If cooperative, move quickly. If suspicious, identify the company and reference without over-talking.",
    `Tone: ${agentSettings.tone}.`,
    `Voice preset: ${agentSettings.voice_preset}.`,
    "Open in the selected language for this turn. Hindi is the default safe language, English is secondary, and other supported Indian languages are available only on explicit request.",
    "Do not auto-switch languages because of code-mixing. Switch immediately when the receiver clearly asks for another supported language.",
    `Supported languages for this call: ${supportedLanguages}.`,
    "If the receiver asks for an unsupported language, apologize briefly and continue in English or Hindi.",
    "Use only the operator-entered or uploaded contact details as conversation context. Do not invent extra facts, IDs, reasons, or operational promises.",
    "Do not read internal order IDs, machine counts, backend field names, or structured labels aloud unless the receiver asks for them or the confirmation checklist explicitly requires them.",
    `Company: ${context.companyName}.`,
    `Call purpose: ${promptConfig.call_purpose}.`,
    `Request type: ${promptConfig.request_type}.`,
    `Internal reference value: ${context.orderId || "not provided"}.`,
    `Location from uploaded data: ${context.location}.`,
    `Detailed address from uploaded data: ${context.address || "not provided"}.`,
    `Internal machine or item count: ${context.machineCount}.`,
    `Asset label from uploaded data: ${promptConfig.asset_label}.`,
    `Reference label for internal grounding: ${promptConfig.reference_label}.`,
    `Address label to use naturally: ${promptConfig.address_label}.`,
    `Required confirmations: ${confirmationChecklist}.`,
    `Information to collect: ${collectionChecklist}.`,
    `Preferred language hint: ${context.languageHint}.`,
    `Selected language for this turn: ${selectedLanguage}.`,
    `Current stage: ${stage}.`,
    `Receiver name if needed: ${context.contactName ?? "sir/ma'am"}.`,
    `Goal: complete a polite merchant verification call for the ${promptConfig.request_type} request, confirm the required details, and collect missing information without sounding robotic.`,
    `Opening meaning to preserve without repeating it word-for-word: "${buildOpeningLine(context)}"`,
    "Ask only one question at a time.",
    "Do not sound robotic, repetitive, or overly scripted.",
    "If the receiver confirms the request can proceed, briefly recap the confirmed details and close politely.",
    "If the receiver says no, asks for later, or sounds uncertain, ask one short follow-up about the blocker, missing confirmation, or callback timing, then close politely.",
    "If the receiver says wrong number, acknowledge it, apologize, and end the call quickly.",
    "If the receiver asks who is calling, identify the company and repeat the business purpose briefly.",
    options.responseGoal ? `Immediate response goal: ${options.responseGoal}.` : "",
    options.latestReceiverReply ? `Latest receiver reply: ${options.latestReceiverReply}.` : "",
    promptEnhancement ? `Operator prompt enhancement: ${promptEnhancement}` : "",
    agentSettings.self_improve_enabled && selfImprovementNotes ? `Self-improvement guidance from earlier calls: ${selfImprovementNotes}` : "",
    "Do not promise engineer arrival times, prices, refunds, or support actions.",
    "End politely and briefly."
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildOpeningLine(context: VoiceAgentContext) {
  const promptConfig = getPromptConfig(context.promptConfig);
  const assetLabel = promptConfig.asset_label.trim();
  const addressValue = context.address.trim() || context.location.trim();
  const addressPart = addressValue ? ` for the ${assetLabel.toLowerCase()} at ${addressValue}` : ` for your ${assetLabel.toLowerCase()}`;

  return `Hello, I am calling from ${context.companyName}. This is about ${promptConfig.request_type}${addressPart}. We are calling to ${promptConfig.call_purpose}. Could you please confirm whether this request can proceed and the details are correct?`;
}

export function buildOpeningVariants(context: VoiceAgentContext) {
  const promptConfig = getPromptConfig(context.promptConfig);
  const assetLabel = promptConfig.asset_label.trim().toLowerCase();
  const addressValue = context.address.trim() || context.location.trim();
  const locationPhrase = addressValue ? `at ${addressValue}` : "from your uploaded location";
  const receiverName = context.contactName?.trim() || "sir or ma'am";

  return [
    `Namaste ${receiverName}, this is ${context.companyName}. I am calling about the ${promptConfig.request_type} request for the ${assetLabel} ${locationPhrase}. Can I quickly confirm if we can proceed?`,
    `Hello ${receiverName}, ${context.companyName} side se call hai. This is for ${promptConfig.call_purpose} for the ${assetLabel} ${locationPhrase}. Is now a good time to confirm the details?`,
    `Hi ${receiverName}, I am calling from ${context.companyName} regarding the ${promptConfig.request_type} request ${locationPhrase}. Could you confirm if the request can proceed now?`,
    `Namaste, ${context.companyName} se bol raha hoon. ${assetLabel} ${locationPhrase} ke ${promptConfig.request_type} request ke liye short confirmation chahiye. Kya request proceed kar sakta hai?`
  ];
}

export function buildOpeningTurnInstruction(context: VoiceAgentContext) {
  return [
    "Create the first spoken turn now.",
    "Do not read any one template verbatim.",
    "Choose a natural variation from the opening examples or write a similar short line.",
    "Keep the same business meaning, company name, request type, address or location, and one confirmation question.",
    "Do not mention internal reference IDs unless the receiver asks.",
    `Opening examples: ${buildOpeningVariants(context).map((line, index) => `${index + 1}. ${line}`).join(" ")}`
  ].join(" ");
}

export function getPromptConfig(input?: Partial<PromptConfig> | null): PromptConfig {
  return {
    call_purpose: cleanPromptField(input?.call_purpose, "validate merchant details and confirm service readiness"),
    request_type: cleanPromptField(input?.request_type, "de-installation"),
    asset_label: input?.asset_label?.trim() || "POS machine",
    reference_label: input?.reference_label?.trim() || "terminal ID",
    address_label: cleanPromptField(input?.address_label, "service address"),
    confirmation_points: normalizeChecklistInput(input?.confirmation_points, defaultConfirmationPoints),
    collection_points: normalizeChecklistInput(input?.collection_points, defaultCollectionPoints)
  };
}

export function getAgentSettings(input?: AgentSettingsInput): AgentSettings {
  const preset = voicePresets.includes(input?.voice_preset as VoicePreset) ? (input?.voice_preset as VoicePreset) : "indian_female_natural";
  const defaultVoice = preset === "indian_male_natural" ? "cedar" : "marin";
  const voiceId = String(input?.voice_id ?? defaultVoice).trim() || defaultVoice;
  const tone = agentTones.includes(input?.tone as AgentTone) ? (input?.tone as AgentTone) : "warm";
  const promptEnhancement = String(input?.prompt_enhancement ?? "").trim().slice(0, 1200);

  return {
    voice_preset: preset,
    voice_id: preset === "openai_custom" ? voiceId : defaultVoice,
    tone,
    prompt_enhancement: promptEnhancement,
    self_improve_enabled: Boolean(input?.self_improve_enabled)
  };
}

export function resolveRealtimeVoice(settings: AgentSettings): RealtimeVoice {
  if (settings.voice_preset === "openai_custom") {
    return { id: settings.voice_id };
  }

  return settings.voice_id;
}

export function buildPromptStudioPreview(input: PromptStudioPreviewInput) {
  const language = input.defaultLanguage.trim() || "hi";
  return buildVoiceAgentInstructions(
    {
      companyName: input.companyName,
      orderId: "DEMO-1001",
      location: "Sample location",
      address: "Sample merchant address",
      machineCount: 1,
      languageHint: language,
      promptConfig: input.promptConfig ?? undefined,
      agentSettings: input.agentSettings,
      selfImprovementNotes: input.selfImprovementNotes
    },
    {
      selectedLanguage: language,
      stage: "opening",
      responseGoal: "Introduce the company, validate the merchant details, and collect the required confirmations.",
      latestReceiverReply: "",
      agentSettings: input.agentSettings,
      selfImprovementNotes: input.selfImprovementNotes
    }
  );
}

export function promptChecklistToText(items: string[]) {
  return items.join("\n");
}

function cleanPromptField(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function normalizeChecklistInput(value: unknown, fallback: string[]) {
  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean)
      .slice(0, 8);
    return normalized.length > 0 ? normalized : fallback;
  }

  if (typeof value === "string") {
    const normalized = value
      .split(/\r?\n|;/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 8);
    return normalized.length > 0 ? normalized : fallback;
  }

  return fallback;
}

function formatChecklistForPrompt(items: string[]) {
  return items.map((item, index) => `${index + 1}. ${item}`).join(" ");
}
