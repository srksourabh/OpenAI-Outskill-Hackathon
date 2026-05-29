import { describe, expect, it } from "vitest";
import { buildManualUploadFile, buildQuickCheckFormData, parsePhoneList, resolveQuickCheckDefaults } from "@/app/campaigns/quick-check";

describe("quick check defaults", () => {
  it("copies the selected campaign agent settings into quick-check form data", () => {
    const defaults = resolveQuickCheckDefaults({
      company_name: "UDS Ops",
      default_language: "hi",
      provider: "simulated",
      prompt_config: {
        call_purpose: "validate merchant details and confirm service readiness",
        request_type: "de-installation",
        asset_label: "card machine",
        reference_label: "terminal ID",
        address_label: "merchant address",
        confirmation_points: ["Confirm merchant name", "Confirm address"],
        collection_points: ["Collect callback timing"]
      },
      agent_settings: {
        voice_preset: "openai_custom",
        voice_id: "voice_custom_123",
        tone: "patient",
        prompt_enhancement: "Ask for callback timing when the receiver is busy.",
        self_improve_enabled: true
      }
    });

    const formData = buildQuickCheckFormData({
      phone: "9876543210",
      language: defaults.language,
      provider: defaults.provider,
      companyName: defaults.companyName,
      promptConfig: defaults.promptConfig,
      agentSettings: defaults.agentSettings
    });

    expect(formData.get("company_name")).toBe("UDS Ops");
    expect(formData.get("default_language")).toBe("hi");
    expect(formData.get("provider")).toBe("simulated");
    expect(formData.get("call_purpose")).toBe("validate merchant details and confirm service readiness");
    expect(formData.get("request_type")).toBe("de-installation");
    expect(formData.get("asset_label")).toBe("card machine");
    expect(formData.get("address_label")).toBe("merchant address");
    expect(formData.get("voice_preset")).toBe("openai_custom");
    expect(formData.get("voice_id")).toBe("voice_custom_123");
    expect(formData.get("tone")).toBe("patient");
    expect(formData.get("prompt_enhancement")).toBe("Ask for callback timing when the receiver is busy.");
    expect(formData.get("self_improve_enabled")).toBe("true");
  });

  it("supports number-list quick check uploads with configurable concurrency", async () => {
    const formData = buildQuickCheckFormData({
      phones: ["9876543210", "  +919876543211 ", "9876543210"],
      language: "en",
      provider: "plivo",
      companyName: "UDS",
      promptConfig: {
        call_purpose: "validate merchant details and confirm service readiness",
        request_type: "de-installation",
        asset_label: "POS machine",
        reference_label: "terminal ID",
        address_label: "service address",
        confirmation_points: ["Confirm merchant name"],
        collection_points: ["Collect callback timing"]
      },
      agentSettings: {
        voice_preset: "indian_male_natural",
        voice_id: "ignored",
        tone: "warm",
        prompt_enhancement: "",
        self_improve_enabled: false
      },
      concurrencyLimit: 2
    });

    const uploadedFile = formData.get("file");
    expect(uploadedFile).toBeInstanceOf(File);
    const csv = await (uploadedFile as File).text();
    expect(csv).toContain("9876543210");
    expect(csv).toContain("+919876543211");
    expect(formData.get("concurrency_limit")).toBe("2");
    expect(formData.get("voice_id")).toBe("cedar");
  });

  it("parses phone-list input from textarea lines and commas", () => {
    expect(parsePhoneList("9876543210,\n +91 9876543211 ;9876543212")).toEqual(["9876543210", "+919876543211", "9876543212"]);
  });

  it("builds a single-row CSV file for one-number quick checks", async () => {
    const file = buildManualUploadFile({ phone: "9876543210", language: "hi" });
    const csv = await file.text();
    expect(csv.split("\n")).toHaveLength(2);
    expect(csv).toContain("9876543210");
    expect(csv).toContain("hi");
  });
});
