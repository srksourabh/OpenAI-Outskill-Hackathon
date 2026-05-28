import { describe, expect, it } from "vitest";
import { canApplyProviderEvent, createCallEvent, hasProviderEvent } from "@/services/campaigns/audit";
import { createCampaignFromContacts, startCampaign } from "@/services/campaigns/engine";
import { isAuthorizedPlivoWebhook, mapPlivoHangup } from "@/services/plivo/webhooks";

describe("Plivo webhook helpers", () => {
  it("accepts matching shared-secret callbacks", () => {
    const url = new URL("https://app.example.com/api/plivo/hangup?callId=123&secret=abc");
    expect(isAuthorizedPlivoWebhook(url, "abc")).toBe(true);
    expect(isAuthorizedPlivoWebhook(url, "xyz")).toBe(false);
  });

  it("maps no-answer and busy outcomes to retryable states", () => {
    expect(mapPlivoHangup({ CallStatus: "no-answer" }).status).toBe("not_picked");
    expect(mapPlivoHangup({ CallStatus: "busy" }).status).toBe("not_connected");
  });

  it("maps invalid-number style failures to invalid_number", () => {
    const result = mapPlivoHangup({ CallStatus: "completed", HangupCause: "number does not exist" });

    expect(result.status).toBe("invalid_number");
    expect(result.disposition).toBe("invalid_number");
  });

  it("detects duplicate provider events and blocks terminal state rewinds", () => {
    const campaign = startCampaign(
      createCampaignFromContacts({
        name: "Webhook audit demo",
        companyName: "UDS",
        defaultLanguage: "hi",
        concurrencyLimit: 1,
        contacts: [
          {
            provider_name: "Ravi",
            phone: "+919999999991",
            location: "Mumbai",
            machine_count: 1,
            order_id: "ORD-1",
            language_hint: "hi",
            alternate_phone: "",
            address: "",
            source_row_data: { phone: "+919999999991" },
            source_row_number: 2
          }
        ]
      })
    );
    const call = { ...campaign.calls[0], status: "completed" as const };
    const event = createCallEvent({
      campaignId: campaign.id,
      callId: call.id,
      provider: "plivo",
      eventType: "hangup",
      providerEventId: "evt-1",
      payload: { CallStatus: "completed" }
    });

    expect(hasProviderEvent({ ...campaign, call_events: [event] }, event)).toBe(true);
    expect(canApplyProviderEvent(call, "ringing")).toBe(false);
    expect(canApplyProviderEvent(call, "completed")).toBe(true);
  });
});
