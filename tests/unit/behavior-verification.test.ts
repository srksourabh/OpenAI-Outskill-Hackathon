import { describe, expect, it } from "vitest";
import { buildPromptStudioPreview } from "@/domain/voice-agent";
import { classifyReceiverAttitude, evaluateCallBehaviorQuality } from "@/services/campaigns/engine";

describe("behavior verification", () => {
  it("scores language and tone adherence for post-call QA", () => {
    const qa = evaluateCallBehaviorQuality({
      transcriptText: "Yes, please call later. I am in a meeting now.",
      expectedLanguage: "en",
      detectedLanguage: "en",
      tone: "patient",
      receiverAttitude: "busy"
    });

    expect(qa.qa_language_status).toBe("pass");
    expect(qa.qa_tone_status).toBe("pass");
    expect(qa.qa_score).toBeGreaterThanOrEqual(75);
  });

  it("detects suspicious and rude receiver attitudes with confidence", () => {
    const suspicious = classifyReceiverAttitude("Is this a scam? Why are you asking OTP details?");
    const rude = classifyReceiverAttitude("Stop calling me. This is nonsense.");

    expect(suspicious.attitude).toBe("suspicious");
    expect(suspicious.confidence).toBeGreaterThan(0.7);
    expect(rude.attitude).toBe("rude");
    expect(rude.confidence).toBeGreaterThan(0.8);
  });
});

describe("prompt studio preview", () => {
  it("blends operator prompt enhancement into the system prompt preview", () => {
    const preview = buildPromptStudioPreview({
      companyName: "eDial",
      defaultLanguage: "hi",
      promptConfig: {
        call_purpose: "validate merchant details and confirm service readiness",
        request_type: "de-installation",
        asset_label: "POS machine",
        reference_label: "terminal ID",
        address_label: "merchant address",
        confirmation_points: ["Confirm merchant name", "Confirm merchant address"],
        collection_points: ["Collect callback timing if needed"]
      },
      agentSettings: {
        tone: "polite",
        voice_preset: "indian_female_natural",
        voice_id: "marin",
        prompt_enhancement: "Confirm callback slot if receiver is busy.",
        self_improve_enabled: true
      },
      selfImprovementNotes: "Keep intros short when the receiver sounds cooperative."
    });

    expect(preview).toContain("Tone: polite");
    expect(preview).toContain("Confirm callback slot if receiver is busy.");
    expect(preview).toContain("Keep intros short when the receiver sounds cooperative.");
  });
});
