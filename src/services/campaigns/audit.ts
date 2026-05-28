import { randomUUID } from "node:crypto";
import { isTerminalCallStatus, type CallStatus } from "@/domain/calls";
import type { CallEventRecord, CallRecord, Campaign } from "./types";

type CreateCallEventInput = {
  campaignId: string;
  callId: string;
  provider: Campaign["provider"];
  eventType: string;
  providerEventId?: string | null;
  payload: Record<string, unknown>;
};

export function createCallEvent(input: CreateCallEventInput): CallEventRecord {
  return {
    id: randomUUID(),
    campaign_id: input.campaignId,
    call_id: input.callId,
    provider: input.provider,
    event_type: input.eventType,
    provider_event_id: input.providerEventId ?? `${input.provider}:${input.eventType}:${input.callId}:${stablePayload(input.payload)}`,
    payload: input.payload,
    created_at: new Date().toISOString()
  };
}

function stablePayload(payload: Record<string, unknown>) {
  return JSON.stringify(
    Object.fromEntries(Object.entries(payload).sort(([left], [right]) => left.localeCompare(right)))
  );
}

export function hasProviderEvent(campaign: Pick<Campaign, "call_events">, event: Pick<CallEventRecord, "provider" | "event_type" | "provider_event_id">) {
  if (!event.provider_event_id) return false;

  return campaign.call_events.some(
    (existing) =>
      existing.provider === event.provider &&
      existing.event_type === event.event_type &&
      existing.provider_event_id === event.provider_event_id
  );
}

export function canApplyProviderEvent(call: Pick<CallRecord, "status">, nextStatus: CallStatus) {
  if (call.status === nextStatus) return true;
  return !isTerminalCallStatus(call.status);
}
