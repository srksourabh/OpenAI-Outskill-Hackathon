import { describe, expect, it } from "vitest";
import { buildInitialAgentPrompt, createAgentSessionState, planAgentTurn } from "@/voice-bridge/agent-session";

const context = {
  companyName: "UDS",
  orderId: "ORD-1001",
  location: "Mumbai",
  address: "Andheri East",
  machineCount: 1,
  languageHint: "en",
  contactName: "Receiver",
  promptConfig: {
    call_purpose: "validate merchant details and confirm service readiness",
    request_type: "de-installation",
    asset_label: "POS machine",
    reference_label: "terminal ID",
    address_label: "merchant address",
    confirmation_points: ["Confirm the merchant name", "Confirm the address"],
    collection_points: ["Collect callback timing if needed"]
  }
};

describe("voice bridge agent session", () => {
  it("creates an opening prompt with the required confirmation question", () => {
    const prompt = buildInitialAgentPrompt(context, createAgentSessionState("en"), ["en", "hi", "bn"]);

    expect(prompt.openingLine).toContain("Could you please confirm whether this request can proceed");
    expect(prompt.openingInstruction).toContain("Do not read any one template verbatim");
    expect(prompt.instructions).toContain("Current stage: opening");
  });

  it("falls back to Hindi when no usable language hint is present", () => {
    expect(createAgentSessionState("").selectedLanguage).toBe("hi");
  });

  it("switches language only when the receiver explicitly asks", () => {
    const turn = planAgentTurn("Hindi me bolo", context, createAgentSessionState("en"), ["en", "hi", "bn"]);

    expect(turn.state.selectedLanguage).toBe("hi");
    expect(turn.plan.responseGoal).toContain("switch immediately");
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
