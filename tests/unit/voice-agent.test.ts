import { describe, expect, it } from "vitest";
import { buildVoiceAgentInstructions } from "@/domain/voice-agent";

describe("buildVoiceAgentInstructions", () => {
  it("tells the agent to switch language when the receiver asks", () => {
    const instructions = buildVoiceAgentInstructions({
      companyName: "Demo Logistics",
      orderId: "ORD-1001",
      location: "Mumbai",
      machineCount: 2,
      languageHint: "hi"
    });

    expect(instructions).toContain("if the receiver asks for another supported language");
    expect(instructions).toContain("switch immediately");
    expect(instructions).toContain("starting preference, not a hard lock");
  });
});
