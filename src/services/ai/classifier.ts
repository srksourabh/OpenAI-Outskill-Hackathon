import type { CallOutcome } from "@/domain/voice-agent";

const hindiMarkers = ["haan", "nahi", "ready hai", "taiyar", "pickup ke liye"];
const affirmative = ["yes", "ready", "confirmed", "haan", "ha", "taiyar", "ready hai"];
const negative = ["no", "not ready", "nahi", "nahin", "delay", "later", "kal", "baad"];

export function classifyTranscript(transcript: string): CallOutcome {
  const text = transcript.toLowerCase();
  const detected_language = hindiMarkers.some((marker) => text.includes(marker)) ? "hi" : "en";

  if (affirmative.some((marker) => text.includes(marker)) && !text.includes("not ready")) {
    return {
      disposition: "confirmed_pickup",
      next_action: "send_engineer",
      detected_language,
      summary_text: "Contact confirmed that the request can proceed.",
      reason_code: null,
      confidence: 0.88
    };
  }

  if (negative.some((marker) => text.includes(marker)) && !text.includes("not sure")) {
    return {
      disposition: "follow_up_needed",
      next_action: "manual_followup",
      detected_language,
      summary_text: "Contact did not confirm readiness and needs follow-up.",
      reason_code: "not_ready",
      confidence: 0.74
    };
  }

  return {
    disposition: "manual_review",
    next_action: "verify_data",
    detected_language,
    summary_text: transcript.trim() ? "Transcript was unclear and needs manual review." : "No transcript captured.",
    reason_code: "unclear",
    confidence: 0.35
  };
}
