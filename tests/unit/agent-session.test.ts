import { describe, expect, it } from "vitest";
import { buildInitialAgentPrompt, createAgentSessionState, planAgentTurn } from "@/voice-bridge/agent-session";

const context = {
  companyName: "Demo Logistics",
  orderId: "ORD-1001",
  location: "Mumbai",
  machineCount: 1,
  languageHint: "en",
  contactName: "Receiver"
} as const;

describe("voice bridge agent session", () => {
  it("creates an opening prompt with the required de-installation question", () => {
    const prompt = buildInitialAgentPrompt(context, createAgentSessionState("en"), ["en", "hi", "bn"]);

    expect(prompt.openingLine).toContain("Please tell me whether the machine is there with you or not");
    expect(prompt.instructions).toContain("Current stage: opening");
  });

  it("switches language only when the receiver explicitly asks", () => {
    const turn = planAgentTurn("Please speak in Hindi", context, createAgentSessionState("en"), ["en", "hi", "bn"]);

    expect(turn.state.selectedLanguage).toBe("hi");
    expect(turn.instructions).toContain("Hindi");
  });

  it("moves to closing with a confirmed disposition when the receiver says yes", () => {
    const turn = planAgentTurn("Yes, the machine is with me and ready.", context, createAgentSessionState("en"), ["en", "hi"]);

    expect(turn.plan.dispositionHint).toBe("confirmed_pickup");
    expect(turn.state.shouldClose).toBe(true);
    expect(turn.plan.stage).toBe("closing");
  });

  it("asks one follow-up for not-ready answers", () => {
    const turn = planAgentTurn("No, not ready. Call later tomorrow.", context, createAgentSessionState("en"), ["en", "hi"]);

    expect(turn.plan.dispositionHint).toBe("follow_up_needed");
    expect(turn.plan.stage).toBe("follow_up");
    expect(turn.state.followUpCount).toBe(1);
  });
});
