import { describe, expect, it } from "vitest";
import { buildPlivoStreamXml } from "@/services/plivo/xml";

describe("buildPlivoStreamXml", () => {
  it("returns AudioStream XML pointing at the voice bridge", () => {
    const xml = buildPlivoStreamXml({
      wsUrl: "wss://voice.example.com/plivo/audio-stream?callId=123",
      statusCallbackUrl: "https://app.example.com/api/plivo/stream-status"
    });

    expect(xml).toContain("<Response>");
    expect(xml).toContain("wss://voice.example.com/plivo/audio-stream?callId=123");
    expect(xml).toContain("bidirectional");
  });
});
