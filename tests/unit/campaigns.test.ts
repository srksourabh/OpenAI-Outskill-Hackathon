import { describe, expect, it } from "vitest";
import { createCampaignFromContacts, startCampaign } from "@/services/campaigns/engine";
import type { ParsedContact } from "@/services/ingestion/types";

const contacts: ParsedContact[] = Array.from({ length: 7 }, (_, index) => ({
  provider_name: `Provider ${index + 1}`,
  phone: `+91999999999${index}`,
  location: "Mumbai",
  machine_count: 1,
  order_id: `ORD-${index + 1}`,
  language_hint: "hi",
  alternate_phone: "",
  address: "",
  source_row_data: {
    provider_name: `Provider ${index + 1}`,
    phone: `+91999999999${index}`,
    location: "Mumbai",
    machine_count: "1",
    order_id: `ORD-${index + 1}`,
    language_hint: "hi"
  },
  source_row_number: index + 2
}));

describe("campaign engine", () => {
  it("starts campaigns with bounded parallel active calls", () => {
    const campaign = createCampaignFromContacts({
      name: "Demo",
      companyName: "Demo Logistics",
      defaultLanguage: "hi",
      concurrencyLimit: 5,
      contacts
    });

    const started = startCampaign(campaign);

    expect(started.calls).toHaveLength(7);
    expect(started.calls.filter((call) => call.status === "ringing")).toHaveLength(5);
    expect(started.calls.filter((call) => call.status === "queued")).toHaveLength(2);
  });
});
