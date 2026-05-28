import { describe, expect, it } from "vitest";
import { buildResultsCsv, buildResultsCsvChunks, buildResultsHtmlTableChunks } from "@/services/export/csv";
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
    expect(csv).toContain("callback_requested_at");
    expect(csv).toContain("callback_remarks");
    expect(csv).toContain("missed_call_note");
    expect(csv).toContain("Gate 2");
  });

  it("emits CSV output incrementally without buffering all rows into one string", () => {
    const campaign = simulateCallOutcomes(startCampaign(createCampaignFromContacts({
      name: "Demo",
      companyName: "Demo Logistics",
      defaultLanguage: "hi",
      concurrencyLimit: 5,
      contacts: [
        buildContact("Ravi", "+919999999991", "ORD-1", "Gate 2"),
        buildContact("Neha", "+919999999992", "ORD-2", "Dock 4")
      ]
    })));

    const chunks = Array.from(buildResultsCsvChunks(campaign));

    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toContain("custom_note");
    expect(chunks[1]).toContain("Gate 2");
    expect(chunks[2]).toContain("Dock 4");
  });

  it("emits HTML table output in row chunks", () => {
    const campaign = simulateCallOutcomes(startCampaign(createCampaignFromContacts({
      name: "Demo",
      companyName: "Demo Logistics",
      defaultLanguage: "hi",
      concurrencyLimit: 5,
      contacts: [
        buildContact("Ravi", "+919999999991", "ORD-1", "Gate 2"),
        buildContact("Neha", "+919999999992", "ORD-2", "Dock 4")
      ]
    })));

    const chunks = Array.from(buildResultsHtmlTableChunks(campaign));

    expect(chunks[0]).toContain("<thead>");
    expect(chunks.filter((chunk) => chunk.startsWith("<tr>"))).toHaveLength(2);
    expect(chunks.at(-1)).toBe("</tbody></table></body></html>");
  });
});

function buildContact(providerName: string, phone: string, orderId: string, customNote: string): ParsedContact {
  return {
    provider_name: providerName,
    phone,
    location: "Mumbai",
    machine_count: 2,
    order_id: orderId,
    language_hint: "hi",
    alternate_phone: "",
    address: "",
    source_row_data: {
      provider_name: providerName,
      phone,
      location: "Mumbai",
      machine_count: "2",
      order_id: orderId,
      custom_note: customNote
    },
    source_row_number: 2
  };
}
