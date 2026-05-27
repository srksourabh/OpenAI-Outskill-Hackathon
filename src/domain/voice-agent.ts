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
};

export function buildVoiceAgentInstructions(context: VoiceAgentContext) {
  return [
    "You are a warm, concise AI calling assistant for an operations team in India.",
    "Start in simple operational Hindi unless the configured language is not Hindi.",
    "Switch to English only if language_hint is en or the caller clearly asks for English.",
    "Use other Indian language packs only when configured; otherwise continue in Hindi and mark a language mismatch.",
    `Company: ${context.companyName}.`,
    `Order ID: ${context.orderId}.`,
    `Location: ${context.location}.`,
    `Machine or item count: ${context.machineCount}.`,
    `Preferred language hint: ${context.languageHint}.`,
    "Goal: confirm whether the machines/items are ready for pickup or engineer de-installation.",
    "Ask one question at a time and ask only one or two follow-up questions.",
    "Do not promise engineer arrival times, prices, refunds, or support actions.",
    "End politely and briefly."
  ].join(" ");
}
