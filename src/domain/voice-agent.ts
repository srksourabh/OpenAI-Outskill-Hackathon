import type { PromptConfig } from "@/services/campaigns/types";
import { z } from "zod";

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
};

export type VoiceAgentStage = "opening" | "readiness_question" | "follow_up" | "closing";

export function buildVoiceAgentInstructions(
  context: VoiceAgentContext,
  options: {
    stage?: VoiceAgentStage;
    selectedLanguage?: string;
    supportedLanguages?: string[];
    responseGoal?: string;
    latestReceiverReply?: string;
  } = {}
) {
  const stage = options.stage ?? "opening";
  const selectedLanguage = options.selectedLanguage ?? context.languageHint;
  const supportedLanguages = options.supportedLanguages?.join(", ") ?? "en, hi, bn, pa, gu, mr, ta, te, ml, kn, or, as";
  const promptConfig = getPromptConfig(context.promptConfig);

  return [
    "You are a warm, concise AI calling assistant for an operations team in India.",
    "Sound like a polite Indian female operations caller. Speak like a real person on a phone call: short spoken sentences, natural pacing, light conversational glue, and respectful phrasing.",
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
