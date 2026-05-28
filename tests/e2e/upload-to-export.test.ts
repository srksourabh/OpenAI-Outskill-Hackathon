import { describe, expect, it } from "vitest";
import { createCampaignFromContacts, getCampaignStats, simulateCallOutcomes, startCampaign } from "@/services/campaigns/engine";
import { buildResultsCsv } from "@/services/export/csv";
import { parseContactFile } from "@/services/ingestion/parser";

describe("upload-to-export golden path", () => {
  it("uploads contacts, queues calls, simulates outcomes, shows stats, and exports rows", async () => {
    const csv = [
      "provider_name,phone,location,machine_count,order_id,language_hint,custom_note",
      "Asha,+919999999991,Mumbai,1,ORD-1,hi,Gate 1",
      "Bala,+919999999992,Delhi,1,ORD-2,en,Gate 2",
      "Chitra,+919999999993,Chennai,1,ORD-3,ta,Gate 3",
      "Dev,+919999999994,Pune,1,ORD-4,hi,Gate 4",
      "Esha,+919999999995,Surat,1,ORD-5,gu,Gate 5",
      "Farhan,+919999999996,Kolkata,1,ORD-6,bn,Gate 6",
      "Gita,+919999999997,Jaipur,1,ORD-7,hi,Gate 7",
      "Hari,+919999999998,Lucknow,1,ORD-8,hi,Gate 8",
      "Ila,+919999999989,Bhopal,1,ORD-9,hi,Gate 9",
      "Jai,+919999999988,Patna,1,ORD-10,hi,Gate 10"
    ].join("\n");

    const parsed = await parseContactFile({
      fileName: "demo.csv",
      content: Buffer.from(csv),
      defaultLanguage: "hi"
    });
    const campaign = createCampaignFromContacts({
      name: "Golden path",
      companyName: "UDS",
      defaultLanguage: "hi",
      concurrencyLimit: 5,
      contacts: parsed.validRows
    });
    const started = startCampaign(campaign);
    const completed = simulateCallOutcomes(started, {
      count: 8,
      transcripts: [
        "Haan, machine pickup ke liye ready hai.",
        "Yes, pickup is ready.",
        "Haan ready hai, engineer bhej dijiye.",
        "Nahi, abhi ready nahi hai. Kal call kijiye.",
        "Not ready yet, please follow up next week.",
        "",
        "Phone number invalid",
        "No answer"
      ]
    });
    const stats = getCampaignStats(completed);
    const csvExport = buildResultsCsv(completed);

    expect(parsed.validRows).toHaveLength(10);
    expect(started.calls).toHaveLength(10);
    expect(started.calls.filter((call) => call.status === "ringing")).toHaveLength(5);
    expect(stats.confirmedPickup).toBeGreaterThanOrEqual(3);
    expect(stats.followUpNeeded).toBeGreaterThanOrEqual(2);
    expect(stats.invalidNumbers).toBeGreaterThanOrEqual(1);
    expect(completed.calls.some((call) => call.status === "not_picked")).toBe(true);
    expect(csvExport).toContain("custom_note");
    expect(csvExport).toContain("confirmed_pickup");
    expect(csvExport).toContain("follow_up_needed");
  });
});
