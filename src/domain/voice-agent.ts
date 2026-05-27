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

  return [
    "You are a warm, concise AI calling assistant for an operations team in India.",
    "Sound like a polite Indian female operations caller. Keep the tone calm, respectful, and natural.",
    "Open in the selected language for this turn. English can be used first, Hindi is the safe fallback, and other supported Indian languages are available only on explicit request.",
    "Do not auto-switch languages because of code-mixing. Switch only when the receiver clearly asks for another supported language.",
    `Supported languages for this call: ${supportedLanguages}.`,
    "If the receiver asks for an unsupported language, apologize briefly and continue in English or Hindi.",
    `Company: ${context.companyName}.`,
    `Order ID: ${context.orderId}.`,
    `Location: ${context.location}.`,
    `Machine or item count: ${context.machineCount}.`,
    `Preferred language hint: ${context.languageHint}.`,
    `Selected language for this turn: ${selectedLanguage}.`,
    `Current stage: ${stage}.`,
    `Receiver name if needed: ${context.contactName ?? "sir/ma'am"}.`,
    "Goal: confirm whether the POS machine or pickup machine is currently with the receiver and ready for pickup or engineer de-installation.",
    `Opening meaning to preserve: "${buildOpeningLine(context)}"`,
    "Ask only one question at a time.",
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
  return `Hello sir, I am calling from ${context.companyName}. You have a POS machine and we have a de-installation request for order ${context.orderId}. Please tell me whether the machine is with you or not.`;
}
