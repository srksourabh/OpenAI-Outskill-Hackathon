import { describe, expect, it } from "vitest";
import { getBridgeRequestInfo, isVoiceBridgeHealthPath, isVoiceBridgeUpgradePath, voiceBridgeHealthPath, voiceBridgePath } from "@/voice-bridge/http";

describe("voice bridge HTTP helpers", () => {
  it("recognizes the websocket upgrade path", () => {
    expect(isVoiceBridgeUpgradePath(voiceBridgePath)).toBe(true);
    expect(isVoiceBridgeUpgradePath("/")).toBe(false);
  });

  it("recognizes the health path", () => {
    expect(isVoiceBridgeHealthPath(voiceBridgeHealthPath)).toBe(true);
    expect(isVoiceBridgeHealthPath("/")).toBe(true);
    expect(isVoiceBridgeHealthPath("/other")).toBe(false);
  });

  it("parses request URLs against the incoming host", () => {
    const result = getBridgeRequestInfo("/plivo/audio-stream?callId=abc", "localhost:8080");

    expect(result.pathname).toBe("/plivo/audio-stream");
    expect(result.searchParams.get("callId")).toBe("abc");
  });
});
