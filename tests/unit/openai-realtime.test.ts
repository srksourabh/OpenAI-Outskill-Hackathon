import { describe, expect, it } from "vitest";
import { buildRealtimeHeaders, buildRealtimeUrl, realtimeOutputModalities } from "@/voice-bridge/openaiRealtime";

describe("OpenAI Realtime bridge config", () => {
  it("uses the GA realtime websocket URL", () => {
    expect(buildRealtimeUrl("gpt-realtime-2")).toBe("wss://api.openai.com/v1/realtime?model=gpt-realtime-2");
  });

  it("does not include the deprecated beta header", () => {
    expect(buildRealtimeHeaders("test-key")).toEqual({
      Authorization: "Bearer test-key"
    });
  });

  it("uses audio-only output modalities for the GA realtime API", () => {
    expect(realtimeOutputModalities).toEqual(["audio"]);
  });
});
