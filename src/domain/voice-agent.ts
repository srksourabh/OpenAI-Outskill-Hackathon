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
    "Start in the preferred language hint when it is supported; otherwise start in simple operational Hindi.",
    "At any point in the call, if the receiver asks for another supported language, acknowledge it and switch immediately.",
    "Supported live languages are Hindi and English, with configured regional packs available for Bengali, Punjabi, Gujarati, Marathi, Tamil, Telugu, Malayalam, Kannada, Odia, and Assamese.",
    "Treat language_hint only as the starting preference, not a hard lock for the whole call.",
    "If the receiver asks for a language that is not supported, politely continue in Hindi or English and note the mismatch.",
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
