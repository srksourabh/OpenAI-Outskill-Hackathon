import { describe, expect, it } from "vitest";
import { buildOpeningLine, buildVoiceAgentInstructions } from "@/domain/voice-agent";

describe("buildVoiceAgentInstructions", () => {
  it("tells the agent to switch language when the receiver asks", () => {
    const instructions = buildVoiceAgentInstructions({
      companyName: "Demo Logistics",
      orderId: "ORD-1001",
      location: "Mumbai",
      machineCount: 2,
      languageHint: "hi"
    });

    expect(instructions).toContain("explicit request");
    expect(instructions).toContain("Selected language for this turn");
    expect(instructions).toContain("de-installation request");
  });

  it("builds the required opening line for the live call", () => {
    expect(
      buildOpeningLine({
        companyName: "Demo Logistics",
        orderId: "ORD-1001",
        location: "Mumbai",
        machineCount: 2,
        languageHint: "en"
      })
    ).toContain("Please tell me whether the machine is with you or not");
  });
});
