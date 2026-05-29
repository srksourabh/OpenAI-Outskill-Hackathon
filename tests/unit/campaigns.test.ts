import { describe, expect, it } from "vitest";
import { createCampaignFromContacts, extractCallbackSchedule, simulateCallOutcomes, startCampaign } from "@/services/campaigns/engine";
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
      companyName: "UDS",
      defaultLanguage: "hi",
      concurrencyLimit: 5,
      contacts,
      promptConfig: {
        call_purpose: "validate merchant details and confirm service readiness",
        request_type: "de-installation",
        asset_label: "POS machine",
        reference_label: "Terminal ID",
        address_label: "merchant address",
        confirmation_points: ["Confirm merchant name", "Confirm address"],
        collection_points: ["Collect callback timing"]
      }
    });

    const started = startCampaign(campaign);

    expect(started.prompt_config.reference_label).toBe("Terminal ID");
    expect(started.prompt_config.request_type).toBe("de-installation");
    expect(started.calls).toHaveLength(7);
    expect(started.calls.filter((call) => call.status === "ringing")).toHaveLength(5);
    expect(started.calls.filter((call) => call.status === "queued")).toHaveLength(2);
  });

  it("stores default agent settings and snapshots them onto future calls", () => {
    const campaign = createCampaignFromContacts({
      name: "Demo",
      companyName: "UDS",
      defaultLanguage: "hi",
      concurrencyLimit: 2,
      contacts,
      agentSettings: {
        voice_preset: "indian_male_natural",
        voice_id: "cedar",
        tone: "patient",
        prompt_enhancement: "Ask for callback timing if the receiver is busy.",
        self_improve_enabled: true
      }
    });

    const started = startCampaign(campaign);

    expect(campaign.agent_settings.voice_preset).toBe("indian_male_natural");
    expect(started.calls[0].voice_preset_snapshot).toBe("indian_male_natural");
    expect(started.calls[0].voice_id_snapshot).toBe("cedar");
    expect(started.calls[0].tone_snapshot).toBe("patient");
    expect(started.calls[0].prompt_enhancement_snapshot).toBe("Ask for callback timing if the receiver is busy.");
    expect(started.calls[0].receiver_attitude).toBe("unknown");
    expect(started.calls[0].qa_language_status).toBe("warn");
    expect(started.calls[0].qa_tone_status).toBe("warn");
    expect(started.calls[0].qa_notes).toContain("has not produced transcript evidence");
    expect(started.calls[0].callback_requested_at).toBeNull();
    expect(started.calls[0].callback_remarks).toBe("");
    expect(started.calls[0].missed_call_note).toBe("");
    expect(started.calls[0].status_history.at(-1)?.status).toBe("ringing");
  });

  it("does not rewrite existing call snapshots when campaign settings change", () => {
    const campaign = createCampaignFromContacts({
      name: "Demo",
      companyName: "UDS",
      defaultLanguage: "hi",
      concurrencyLimit: 2,
      contacts,
      agentSettings: {
        voice_preset: "indian_female_natural",
        voice_id: "marin",
        tone: "warm",
        prompt_enhancement: "First version.",
        self_improve_enabled: false
      }
    });
    const started = startCampaign(campaign);
    const edited = {
      ...started,
      agent_settings: {
        voice_preset: "indian_male_natural" as const,
        voice_id: "cedar",
        tone: "direct" as const,
        prompt_enhancement: "Second version.",
        self_improve_enabled: true
      }
    };

    expect(edited.calls[0].voice_id_snapshot).toBe("marin");
    expect(edited.calls[0].tone_snapshot).toBe("warm");
    expect(edited.calls[0].prompt_enhancement_snapshot).toBe("First version.");
  });

  it("accepts custom simulated transcripts and stores classification confidence", () => {
    const campaign = createCampaignFromContacts({
      name: "Demo",
      companyName: "UDS",
      defaultLanguage: "hi",
      concurrencyLimit: 2,
      contacts
    });

    const simulated = startCampaign(campaign);
    const completed = simulateCallOutcomes(simulated, {
      count: 2,
      transcripts: ["Haan, pickup ready hai.", "Maybe later, I am not sure."]
    });

    expect(completed.calls[0].disposition).toBe("confirmed_pickup");
    expect(completed.calls[0].confidence).toBeGreaterThan(0.8);
    expect(completed.calls[0].qa_score).toBeGreaterThan(50);
    expect(completed.calls[0].receiver_attitude_confidence).toBeGreaterThan(0);
    expect(completed.calls[1].disposition).toBe("manual_review");
    expect(completed.calls[1].confidence).toBeLessThan(0.5);
  });

  it("captures callback schedule metadata for follow-up outcomes", () => {
    const campaign = createCampaignFromContacts({
      name: "Demo",
      companyName: "UDS",
      defaultLanguage: "hi",
      concurrencyLimit: 2,
      contacts
    });

    const simulated = startCampaign(campaign);
    const completed = simulateCallOutcomes(simulated, {
      count: 1,
      transcripts: ["Not ready now, please call back after 2 days at 5 pm."]
    });

    expect(completed.calls[0].disposition).toBe("follow_up_needed");
    expect(completed.calls[0].callback_requested_at).toBeTruthy();
    expect(completed.calls[0].callback_remarks).toContain("call back");
  });

  it("extracts grouped callback day offsets without matching words ending in in", () => {
    const now = "2026-05-28T09:30:00.000Z";

    const pluralDays = extractCallbackSchedule("Please call back in 3 days at 5 pm.", now);
    expect(pluralDays.callback_requested_at).toBe("2026-05-31T17:00:00.000Z");

    const withinDays = extractCallbackSchedule("Please call back within 3 days at 5 pm.", now);
    expect(withinDays.callback_requested_at).toBe("2026-05-28T17:00:00.000Z");
  });
});
