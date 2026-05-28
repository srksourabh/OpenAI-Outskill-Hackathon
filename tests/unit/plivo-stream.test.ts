import { describe, expect, it } from "vitest";
import { parsePlivoEvent, sendAudioToPlivo } from "@/voice-bridge/plivoStream";

describe("Plivo audio stream helpers", () => {
  it("parses start and media events from Plivo", () => {
    expect(parsePlivoEvent(Buffer.from(JSON.stringify({ event: "start", start: { streamId: "s1" } }))).event).toBe("start");
    expect(parsePlivoEvent(Buffer.from(JSON.stringify({ event: "media", media: { payload: "abc" } }))).event).toBe("media");
  });

  it("sends OpenAI audio deltas back to Plivo as playAudio", () => {
    const sent: string[] = [];
    const ws = {
      OPEN: 1,
      readyState: 1,
      send: (value: string) => sent.push(value)
    };

    sendAudioToPlivo(ws as never, "abc123");

    expect(JSON.parse(sent[0])).toEqual({
      event: "playAudio",
      media: {
        contentType: "audio/x-mulaw",
        sampleRate: 8000,
        payload: "abc123"
      }
    });
  });
});
