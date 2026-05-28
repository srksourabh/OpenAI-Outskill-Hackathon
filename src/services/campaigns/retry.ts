import { isRetryEligible } from "@/domain/calls";
import { buildStatusHistory } from "./engine";
import type { Campaign } from "./types";

export function retryCallInCampaign(campaign: Campaign, callId: string): Campaign {
  const now = new Date().toISOString();

  return {
    ...campaign,
    status: "running",
    calls: campaign.calls.map((call) => {
      if (call.id !== callId) return call;
      if (!isRetryEligible(call.status, call.disposition)) return call;
      if (call.attempt_number >= campaign.retry_limit) return call;

      return {
        ...call,
        status: "queued",
        disposition: "unknown",
        next_action: "none",
        attempt_number: call.attempt_number + 1,
        transcript_text: "",
        transcript_status: "missing",
        summary_text: "Retry queued.",
        reason_code: null,
        confidence: 0,
        retry_eligible: false,
        last_call_time: null,
        provider_call_id: null,
        receiver_attitude: "unknown",
        improvement_note: "",
        status_history: [...call.status_history, ...buildStatusHistory("queued", now)],
        updated_at: now
      };
    })
  };
}
