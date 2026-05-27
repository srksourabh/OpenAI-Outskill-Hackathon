import WebSocket from "ws";

export function connectOpenAIRealtime(input: { apiKey: string; model: string; voice: string; instructions: string }) {
  const ws = new WebSocket(`wss://api.openai.com/v1/realtime?model=${encodeURIComponent(input.model)}`, {
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "OpenAI-Beta": "realtime=v1"
    }
  });

  ws.on("open", () => {
    ws.send(
      JSON.stringify({
        type: "session.update",
        session: {
          type: "realtime",
          model: input.model,
          output_modalities: ["audio", "text"],
          audio: {
            input: { format: { type: "audio/pcmu" }, turn_detection: { type: "semantic_vad" } },
            output: { format: { type: "audio/pcmu" }, voice: input.voice }
          },
          instructions: input.instructions
        }
      })
    );
  });

  return ws;
}

export function appendRealtimeAudio(ws: WebSocket, base64Audio: string) {
  if (ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio: base64Audio }));
}
