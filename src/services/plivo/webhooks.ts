import type { CallStatus, Disposition, NextAction } from "@/domain/calls";
import { mapDispositionToNextAction } from "@/domain/calls";

export type PlivoWebhookPayload = Record<string, string>;

export type PlivoHangupOutcome = {
  status: CallStatus;
  disposition: Disposition;
  nextAction: NextAction;
  summary: string;
};

export async function parsePlivoWebhookRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const url = new URL(request.url);

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    return {
      url,
      payload: Object.fromEntries(Array.from(formData.entries()).map(([key, value]) => [key, String(value)]))
    };
  }

  if (contentType.includes("application/json")) {
    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return {
      url,
      payload: Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, String(value ?? "")]))
    };
  }

  const text = await request.text().catch(() => "");
  const params = new URLSearchParams(text);

  return {
    url,
    payload: Object.fromEntries(params.entries())
  };
}

export function isAuthorizedPlivoWebhook(url: URL, secret: string) {
  if (!secret || secret.startsWith("replace-with")) return true;
  return url.searchParams.get("secret") === secret;
}

export function mapPlivoHangup(payload: PlivoWebhookPayload) {
  const callStatus = (payload.CallStatus ?? payload.call_status ?? "").toLowerCase();
  const cause = `${payload.HangupCause ?? payload.hangup_cause ?? ""}`.toLowerCase();

  if (cause.includes("invalid") || cause.includes("number does not exist") || cause.includes("rejected")) {
    return buildHangupOutcome("invalid_number", "invalid_number", "The call failed because the number appears invalid.");
  }

  if (callStatus === "no-answer") {
    return buildHangupOutcome("not_picked", "not_picked", "The receiver did not answer the call.");
  }

  if (callStatus === "busy" || callStatus === "cancel" || callStatus === "timeout") {
    return buildHangupOutcome("not_connected", "not_connected", "The call could not be connected successfully.");
  }

  return buildHangupOutcome("completed", "manual_review", "The call ended after connection. Review the captured transcript and remarks.");
}

function buildHangupOutcome(status: CallStatus, disposition: Disposition, summary: string): PlivoHangupOutcome {
  return {
    status,
    disposition,
    nextAction: mapDispositionToNextAction(disposition),
    summary
  };
}
