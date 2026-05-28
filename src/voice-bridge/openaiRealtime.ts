import WebSocket from "ws";
import type { RealtimeVoice } from "@/domain/voice-agent";

export const realtimeOutputModalities = ["audio"] as const;

export function connectOpenAIRealtime(input: { apiKey: string; model: string; voice: RealtimeVoice; instructions: string }) {
  const ws = new WebSocket(buildRealtimeUrl(input.model), {
    headers: buildRealtimeHeaders(input.apiKey)
  });

  ws.on("open", () => {
    updateRealtimeSession(ws, input.instructions, input.voice, input.model);
  });

  return ws;
}

export function buildRealtimeUrl(model: string) {
  return `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`;
}

export function buildRealtimeHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`
  };
}

export function appendRealtimeAudio(ws: WebSocket, base64Audio: string) {
  if (ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio: base64Audio }));
}

export function updateRealtimeInstructions(ws: WebSocket, instructions: string, input: { voice: RealtimeVoice; model: string }) {
  if (ws.readyState !== ws.OPEN) return;
  updateRealtimeSession(ws, instructions, input.voice, input.model);
}

export function requestRealtimeResponse(ws: WebSocket, instructions?: string) {
  if (ws.readyState !== ws.OPEN) return;

  ws.send(
    JSON.stringify({
      type: "response.create",
      response: {
        output_modalities: realtimeOutputModalities,
        instructions
      }
    })
  );
}

function updateRealtimeSession(ws: WebSocket, instructions: string, voice: RealtimeVoice, model: string) {
  ws.send(
    JSON.stringify({
      type: "session.update",
      session: {
        type: "realtime",
        model,
        output_modalities: realtimeOutputModalities,
        audio: {
          input: {
            format: { type: "audio/pcmu" },
            transcription: { model: "whisper-1" },
            turn_detection: {
              type: "semantic_vad",
              create_response: false,
              interrupt_response: true
            }
          },
          output: { format: { type: "audio/pcmu" }, voice }
        },
        instructions
      }
    })
  );
}
