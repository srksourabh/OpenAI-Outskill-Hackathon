export const callStatuses = [
  "queued",
  "initiated",
  "ringing",
  "answered",
  "completed",
  "failed",
  "not_picked",
  "not_connected",
  "invalid_number",
  "voicemail"
] as const;

export type CallStatus = (typeof callStatuses)[number];

export const dispositions = [
  "unknown",
  "confirmed_pickup",
  "declined",
  "follow_up_needed",
  "manual_review",
  "not_picked",
  "not_connected",
  "invalid_number",
  "voicemail"
] as const;

export type Disposition = (typeof dispositions)[number];

export const nextActions = ["none", "retry", "send_engineer", "manual_followup", "verify_data"] as const;

export type NextAction = (typeof nextActions)[number];

const terminalStatuses = new Set<CallStatus>(["completed", "failed", "not_picked", "not_connected", "invalid_number", "voicemail"]);

export function isTerminalCallStatus(status: CallStatus) {
  return terminalStatuses.has(status);
}

export function isRetryEligible(status: CallStatus, disposition: Disposition) {
  if (["confirmed_pickup", "declined", "manual_review", "invalid_number"].includes(disposition)) return false;
  return status === "failed" || status === "not_picked" || status === "not_connected";
}

export function mapDispositionToNextAction(disposition: Disposition): NextAction {
  if (disposition === "confirmed_pickup") return "send_engineer";
  if (disposition === "follow_up_needed" || disposition === "declined") return "manual_followup";
  if (disposition === "manual_review" || disposition === "invalid_number") return "verify_data";
  if (disposition === "not_picked" || disposition === "not_connected" || disposition === "voicemail") return "retry";
  return "none";
}
