import { describe, expect, it, vi } from "vitest";

describe("/api/health", () => {
  it("does not disclose internal endpoints or config variable names", async () => {
    process.env.VOICE_BRIDGE_PUBLIC_WS_URL = "wss://internal-voice.example.com/plivo/audio-stream";
    process.env.OPENAI_API_KEY = "";
    process.env.ADMIN_API_KEY = "";
    vi.resetModules();

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(serialized).not.toContain("internal-voice.example.com");
    expect(serialized).not.toContain("VOICE_BRIDGE_PUBLIC_WS_URL");
    expect(serialized).not.toContain("OPENAI_API_KEY");
    expect(serialized).not.toContain("ADMIN_API_KEY");
    expect(body.components).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Voice bridge", status: "ok", detail: "Configured for secure Plivo audio streaming." }),
        expect.objectContaining({ name: "OpenAI API", status: "warn", detail: "Not configured." })
      ])
    );
  });

  it("explains placeholder voice bridge configuration without leaking variable names", async () => {
    process.env.VOICE_BRIDGE_PUBLIC_WS_URL = "wss://replace-with-voice-bridge-host/plivo/audio-stream";
    vi.resetModules();

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(serialized).not.toContain("VOICE_BRIDGE_PUBLIC_WS_URL");
    expect(body.components).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Voice bridge",
          status: "warn",
          detail: "Missing public Render WebSocket URL. Expected format: wss://your-render-service.onrender.com/plivo/audio-stream."
        })
      ])
    );
  });
});
