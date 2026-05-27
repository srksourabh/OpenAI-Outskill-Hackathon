import type WebSocket from "ws";
import type { PlivoStreamEvent } from "./types";

export function parsePlivoEvent(data: WebSocket.RawData): PlivoStreamEvent {
  return JSON.parse(data.toString()) as PlivoStreamEvent;
}

export function sendAudioToPlivo(ws: WebSocket, payload: string) {
  if (ws.readyState !== ws.OPEN) return;
  ws.send(
    JSON.stringify({
      event: "playAudio",
      media: {
        contentType: "audio/x-mulaw",
        sampleRate: 8000,
        payload
      }
    })
  );
}
