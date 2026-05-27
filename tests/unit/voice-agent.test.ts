import { describe, expect, it } from "vitest";
import { buildOpeningLine, buildVoiceAgentInstructions } from "@/domain/voice-agent";

describe("buildVoiceAgentInstructions", () => {
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
});
