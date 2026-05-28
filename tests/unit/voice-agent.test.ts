import { describe, expect, it } from "vitest";
import { buildOpeningLine, buildVoiceAgentInstructions, getAgentSettings, resolveRealtimeVoice } from "@/domain/voice-agent";

describe("buildVoiceAgentInstructions", () => {
  it("normalizes default realtime agent settings", () => {
    const settings = getAgentSettings();

    expect(settings).toEqual({
      voice_preset: "indian_female_natural",
      voice_id: "marin",
      tone: "warm",
      prompt_enhancement: "",
      self_improve_enabled: false
    });
    expect(resolveRealtimeVoice(settings)).toBe("marin");
  });

  it("adds tone, prompt enhancement, and self-improvement guidance to the agent prompt", () => {
    const instructions = buildVoiceAgentInstructions(
      {
        companyName: "UDS",
        orderId: "ORD-1001",
        location: "Mumbai",
        machineCount: 1,
        languageHint: "hi"
      },
      {
        agentSettings: {
          voice_preset: "indian_male_natural",
          voice_id: "cedar",
          tone: "patient",
          prompt_enhancement: "Mention that there is no payment request on this call.",
          self_improve_enabled: true
        },
        selfImprovementNotes: "When receivers sound busy, ask for a callback time before repeating details."
      }
    );

    expect(instructions).toContain("Tone: patient");
    expect(instructions).toContain("Mention that there is no payment request on this call.");
    expect(instructions).toContain("Do not repeat the same sentence");
    expect(instructions).toContain("Stop speaking when the receiver interrupts");
    expect(instructions).toContain("Detect the receiver attitude");
    expect(instructions).toContain("When receivers sound busy, ask for a callback time");
  });

  it("tells the agent to switch language when the receiver asks", () => {
    const instructions = buildVoiceAgentInstructions({
      companyName: "UDS",
      orderId: "ORD-1001",
      location: "Mumbai",
      machineCount: 2,
      languageHint: "hi",
      promptConfig: {
        asset_label: "POS machine",
        reference_label: "POS machine number",
        account_label: "bank",
        account_name: "HDFC"
      }
    });

    expect(instructions).toContain("explicit request");
    expect(instructions).toContain("Selected language for this turn");
    expect(instructions).toContain("Do not sound robotic");
    expect(instructions).toContain("Account name: HDFC");
  });

  it("builds the required opening line for the live call", () => {
    expect(
      buildOpeningLine({
        companyName: "UDS",
        orderId: "ORD-1001",
        location: "Mumbai",
        machineCount: 2,
        languageHint: "en",
        promptConfig: {
          asset_label: "POS machine",
          reference_label: "POS machine number",
          account_label: "bank",
          account_name: "HDFC"
        }
      })
    ).toContain("Could you please confirm whether the pos machines are with you right now or not");
  });

  it("uses custom OpenAI voice IDs only for custom OpenAI voice settings", () => {
    expect(
      resolveRealtimeVoice({
        voice_preset: "openai_custom",
        voice_id: "voice_1234",
        tone: "direct",
        prompt_enhancement: "",
        self_improve_enabled: false
      })
    ).toEqual({ id: "voice_1234" });
  });
});
