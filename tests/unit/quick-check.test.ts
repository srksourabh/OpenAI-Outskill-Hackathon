import { describe, expect, it } from "vitest";
import { buildQuickCheckFormData, resolveQuickCheckDefaults } from "@/app/campaigns/quick-check";

describe("quick check defaults", () => {
  it("copies the selected campaign agent settings into quick-check form data", () => {
    const defaults = resolveQuickCheckDefaults({
      company_name: "UDS Ops",
      default_language: "hi",
      provider: "simulated",
      prompt_config: {
        asset_label: "card machine",
        reference_label: "terminal ID",
        account_label: "bank",
        account_name: "HDFC"
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
    expect(formData.get("asset_label")).toBe("card machine");
    expect(formData.get("voice_preset")).toBe("openai_custom");
    expect(formData.get("voice_id")).toBe("voice_custom_123");
    expect(formData.get("tone")).toBe("patient");
    expect(formData.get("prompt_enhancement")).toBe("Ask for callback timing when the receiver is busy.");
    expect(formData.get("self_improve_enabled")).toBe("true");
  });
});
