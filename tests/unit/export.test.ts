import { describe, expect, it } from "vitest";
import { buildResultsCsv } from "@/services/export/csv";
import { createCampaignFromContacts, startCampaign, simulateCallOutcomes } from "@/services/campaigns/engine";
import type { ParsedContact } from "@/services/ingestion/types";

describe("buildResultsCsv", () => {
  it("includes uploaded source columns and appended call-result columns", () => {
    const contact: ParsedContact = {
      provider_name: "Ravi",
      phone: "+919999999991",
      location: "Mumbai",
      machine_count: 2,
      order_id: "ORD-1",
      language_hint: "hi",
      alternate_phone: "",
      address: "",
      source_row_data: {
        provider_name: "Ravi",
        phone: "+919999999991",
        location: "Mumbai",
        machine_count: "2",
        order_id: "ORD-1",
        custom_note: "Gate 2"
      },
      source_row_number: 2
    };

    const campaign = simulateCallOutcomes(startCampaign(createCampaignFromContacts({
      name: "Demo",
      companyName: "Demo Logistics",
      defaultLanguage: "hi",
      concurrencyLimit: 5,
      contacts: [contact]
    })));

    const csv = buildResultsCsv(campaign);

    expect(csv).toContain("custom_note");
    expect(csv).toContain("call_status");
    expect(csv).toContain("recording_url");
    expect(csv).toContain("Gate 2");
  });
});
