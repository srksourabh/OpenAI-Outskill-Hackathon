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
    "Open in the selected language for this turn. English should be used first, Hindi is the safe fallback, and other supported Indian languages are available only on explicit request.",
    "Do not auto-switch languages because of code-mixing. Switch immediately when the receiver clearly asks for another supported language.",
    `Supported languages for this call: ${supportedLanguages}.`,
    "If the receiver asks for an unsupported language, apologize briefly and continue in English or Hindi.",
    `Company: ${context.companyName}.`,
    `Order ID or reference value: ${context.orderId}.`,
    `Location: ${context.location}.`,
    `Machine or item count: ${context.machineCount}.`,
    `Asset label: ${promptConfig.asset_label}.`,
    `Reference label: ${promptConfig.reference_label}.`,
    `Account label: ${promptConfig.account_label}.`,
    `Account name: ${promptConfig.account_name || "not provided"}.`,
    `Preferred language hint: ${context.languageHint}.`,
    `Selected language for this turn: ${selectedLanguage}.`,
    `Current stage: ${stage}.`,
    `Receiver name if needed: ${context.contactName ?? "sir/ma'am"}.`,
    `Goal: confirm whether the ${promptConfig.asset_label.toLowerCase()} is currently with the receiver and ready for pickup or engineer de-installation.`,
    `Opening meaning to preserve: "${buildOpeningLine(context)}"`,
    "Ask only one question at a time.",
    "Do not sound robotic, repetitive, or overly scripted.",
    "If the receiver says yes, confirm the machine is with them and ready, then close politely.",
    "If the receiver says no, asks for later, or sounds uncertain, ask one short follow-up about the reason or callback timing, then close politely.",
    "If the receiver says wrong number, acknowledge it, apologize, and end the call quickly.",
    "If the receiver asks who is calling, identify the company and repeat the de-installation request briefly.",
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
  const assetLabel = promptConfig.asset_label;
  const quantityPart = context.machineCount > 1 ? `${context.machineCount} ${assetLabel}s` : `a ${assetLabel}`;
  const referencePart = context.orderId ? ` regarding ${promptConfig.reference_label} ${context.orderId}` : "";
  const accountPart = promptConfig.account_name ? ` linked to ${promptConfig.account_label} ${promptConfig.account_name}` : "";
  const availabilityPhrase = context.machineCount > 1 ? `${assetLabel.toLowerCase()}s are` : `${assetLabel.toLowerCase()} is`;

  return `Hello, I am calling from ${context.companyName}${referencePart}. We have a de-installation request for ${quantityPart}${accountPart}. Could you please confirm whether the ${availabilityPhrase} with you right now or not?`;
}

export function getPromptConfig(input?: Partial<PromptConfig> | null): PromptConfig {
  return {
    asset_label: input?.asset_label?.trim() || "POS machine",
    reference_label: input?.reference_label?.trim() || "POS machine number",
    account_label: input?.account_label?.trim() || "company/bank",
    account_name: input?.account_name?.trim() || ""
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
      machineCount: 1,
      languageHint: language,
      promptConfig: input.promptConfig ?? undefined,
      agentSettings: input.agentSettings,
      selfImprovementNotes: input.selfImprovementNotes
    },
    {
      selectedLanguage: language,
      stage: "opening",
      responseGoal: "Introduce and verify pickup or de-installation readiness.",
      latestReceiverReply: "",
      agentSettings: input.agentSettings,
      selfImprovementNotes: input.selfImprovementNotes
    }
  );
}
