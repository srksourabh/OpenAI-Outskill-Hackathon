import { describe, expect, it } from "vitest";
import { createCampaignFromContacts, simulateCallOutcomes, startCampaign } from "@/services/campaigns/engine";
import { retryCallInCampaign } from "@/services/campaigns/retry";
import type { ParsedContact } from "@/services/ingestion/types";

const contact: ParsedContact = {
  provider_name: "Retry Contact",
  phone: "+919999999991",
  location: "Mumbai",
  machine_count: 1,
  order_id: "ORD-RETRY",
  language_hint: "hi",
  alternate_phone: "",
  address: "",
  source_row_data: {
    provider_name: "Retry Contact",
    phone: "+919999999991",
    location: "Mumbai",
    machine_count: "1",
    order_id: "ORD-RETRY",
    language_hint: "hi"
  },
  source_row_number: 2
};

describe("retry policy", () => {
  it("requeues retry-eligible calls without exceeding the campaign retry limit", () => {
    const campaign = startCampaign(
      createCampaignFromContacts({
        name: "Retry demo",
        companyName: "UDS",
        defaultLanguage: "hi",
        concurrencyLimit: 1,
        contacts: [contact]
      })
    );
    campaign.calls[0] = {
      ...campaign.calls[0],
      status: "not_picked",
      disposition: "not_picked",
      next_action: "retry",
      retry_eligible: true
    };
    const call = campaign.calls[0];

    const retried = retryCallInCampaign(campaign, call.id);

    expect(retried.calls[0].status).toBe("queued");
    expect(retried.calls[0].attempt_number).toBe(2);
    expect(retried.calls[0].retry_eligible).toBe(false);

    const limitReached = retryCallInCampaign({ ...retried, retry_limit: 1 }, call.id);
    expect(limitReached.calls[0].status).toBe("queued");
    expect(limitReached.calls[0].attempt_number).toBe(2);
  });

  it("does not retry confirmed, declined, invalid, or manual-review calls", () => {
    const campaign = simulateCallOutcomes(
      startCampaign(
        createCampaignFromContacts({
          name: "Retry demo",
          companyName: "UDS",
          defaultLanguage: "hi",
          concurrencyLimit: 1,
          contacts: [contact]
        })
      ),
      { transcripts: ["Haan, machine pickup ke liye ready hai."] }
    );
    const call = campaign.calls[0];

    const retried = retryCallInCampaign(campaign, call.id);

    expect(retried.calls[0].status).toBe("completed");
    expect(retried.calls[0].attempt_number).toBe(1);
  });
});
