import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { buildVoiceAgentInstructions } from "../domain/voice-agent";
import { analyzeTranscriptWithOpenAI } from "../services/ai/openai";
import { getBridgeRequestInfo, isVoiceBridgeHealthPath, isVoiceBridgeUpgradePath, voiceBridgePath } from "./http";
import { connectOpenAIRealtime, appendRealtimeAudio } from "./openaiRealtime";
import { postVoiceOutcome } from "./outcomeClient";
import { parsePlivoEvent, sendAudioToPlivo } from "./plivoStream";

const port = Number(process.env.VOICE_BRIDGE_PORT ?? process.env.PORT ?? 8080);
const httpServer = createServer((request, response) => {
  const { pathname } = getBridgeRequestInfo(request.url, request.headers.host);

  if (isVoiceBridgeHealthPath(pathname)) {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: true, service: "voice-bridge", path: voiceBridgePath }));
    return;
  }

  response.writeHead(404, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ error: "Not found" }));
});

const server = new WebSocketServer({ noServer: true });

server.on("connection", (plivoWs, request) => {
  const { searchParams } = getBridgeRequestInfo(request.url, request.headers.host);
  const callId = searchParams.get("callId");
  if (!callId) {
    plivoWs.close(1008, "Missing callId");
    return;
  }

  let transcriptText = "";
  const realtimeWs = connectOpenAIRealtime({
    apiKey: process.env.OPENAI_API_KEY ?? "",
    model: process.env.OPENAI_REALTIME_MODEL ?? "gpt-realtime-2",
    voice: process.env.OPENAI_REALTIME_VOICE ?? "marin",
    instructions: buildVoiceAgentInstructions({
      companyName: "Demo Logistics",
      orderId: "Realtime call",
      location: "Uploaded location",
      machineCount: 1,
      languageHint: process.env.PRIMARY_CALL_LANGUAGE ?? "hi"
    })
  });

  realtimeWs.on("message", (data) => {
    const event = JSON.parse(data.toString());
    if (typeof event.delta === "string" && String(event.type).includes("transcript")) {
      transcriptText += event.delta;
    }
    if ((event.type === "response.output_audio.delta" || event.type === "response.audio.delta") && typeof event.delta === "string") {
      sendAudioToPlivo(plivoWs, event.delta);
    }
  });

  plivoWs.on("message", (data) => {
    const event = parsePlivoEvent(data);
    const mediaPayload = getMediaPayload(event);
    if (mediaPayload) {
      appendRealtimeAudio(realtimeWs, mediaPayload);
    }
  });

  plivoWs.on("close", () => {
    realtimeWs.close();
    void (async () => {
      const outcome = await analyzeTranscriptWithOpenAI(transcriptText);
      await postVoiceOutcome({
        appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",
        secret: process.env.VOICE_OUTCOME_SECRET ?? "",
        callId,
        transcriptText,
        outcome
      });
    })().catch((error) => console.error("Failed to post voice outcome", error));
  });
});

httpServer.on("upgrade", (request, socket, head) => {
  const { pathname } = getBridgeRequestInfo(request.url, request.headers.host);

  if (!isVoiceBridgeUpgradePath(pathname)) {
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.destroy();
    return;
  }

  server.handleUpgrade(request, socket, head, (ws) => {
    server.emit("connection", ws, request);
  });
});

httpServer.listen(port, () => {
  console.log(`Voice bridge listening on ${port}`);
});

function getMediaPayload(event: Record<string, unknown>) {
  if (event.event !== "media") return null;
  const media = event.media;
  if (!media || typeof media !== "object" || !("payload" in media)) return null;
  const payload = media.payload;
  return typeof payload === "string" ? payload : null;
}
