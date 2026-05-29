import { createServer } from "node:http";
import { mapDispositionToNextAction } from "@/domain/calls";
import { env } from "@/config/env";
import { getAgentSettings, resolveRealtimeVoice } from "@/domain/voice-agent";
import { WebSocketServer } from "ws";
import { analyzeTranscriptWithOpenAI } from "../services/ai/openai";
import { buildInitialAgentPrompt, createAgentSessionState, normalizeSupportedLanguages, planAgentTurn } from "./agent-session";
import { getBridgeRequestInfo, isVoiceBridgeHealthPath, isVoiceBridgeUpgradePath, voiceBridgePath } from "./http";
import { appendRealtimeAudio, connectOpenAIRealtime, requestRealtimeResponse, updateRealtimeInstructions } from "./openaiRealtime";
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

  const agentSettings = getAgentSettings({
    voice_preset: searchParams.get("voicePreset") ?? undefined,
    voice_id: searchParams.get("voiceId") ?? undefined,
    tone: searchParams.get("tone") ?? undefined,
    prompt_enhancement: searchParams.get("promptEnhancement") ?? undefined,
    self_improve_enabled: searchParams.get("selfImproveEnabled") === "true"
  });
  const context = {
    companyName: searchParams.get("companyName") ?? "UDS",
    orderId: searchParams.get("orderId") ?? "Realtime call",
    location: searchParams.get("location") ?? "Uploaded location",
    address: searchParams.get("address") ?? "",
    machineCount: Number(searchParams.get("machineCount") ?? "1") || 1,
    languageHint: searchParams.get("languageHint") ?? env.primaryCallLanguage,
    contactName: searchParams.get("providerName") ?? "sir/ma'am",
    promptConfig: {
      call_purpose: searchParams.get("callPurpose") ?? "validate merchant details and confirm service readiness",
      request_type: searchParams.get("requestType") ?? "de-installation",
      asset_label: searchParams.get("assetLabel") ?? "POS machine",
      reference_label: searchParams.get("referenceLabel") ?? "terminal ID",
      address_label: searchParams.get("addressLabel") ?? "service address",
      confirmation_points: parseChecklistValue(searchParams.get("confirmationPoints") ?? ""),
      collection_points: parseChecklistValue(searchParams.get("collectionPoints") ?? "")
    },
    agentSettings,
    selfImprovementNotes: searchParams.get("selfImprovementNotes") ?? ""
  };
  const supportedLanguages = normalizeSupportedLanguages(env.supportedCallLanguages);
  let sessionState = createAgentSessionState(context.languageHint);
  const transcriptEntries: string[] = [];
  let currentAssistantLine = "";
  let initialResponseRequested = false;
  const initialPrompt = buildInitialAgentPrompt(context, sessionState, supportedLanguages);

  const realtimeWs = connectOpenAIRealtime({
    apiKey: env.openaiApiKey ?? "",
    model: env.openaiRealtimeModel,
    voice: resolveRealtimeVoice(agentSettings),
    instructions: initialPrompt.instructions
  });

  realtimeWs.on("message", (data) => {
    const event = JSON.parse(data.toString()) as Record<string, unknown>;
    const eventType = String(event.type ?? "");

    if (eventType === "session.updated" && !initialResponseRequested) {
      initialResponseRequested = true;
      requestRealtimeResponse(
        realtimeWs,
        `${initialPrompt.instructions} Speak the following first turn verbatim and complete the full sentence before waiting for the receiver: "${initialPrompt.openingLine}"`
      );
      return;
    }

    if ((event.type === "response.output_audio.delta" || event.type === "response.audio.delta") && typeof event.delta === "string") {
      sendAudioToPlivo(plivoWs, event.delta);
      return;
    }

    if ((eventType === "response.output_audio_transcript.delta" || eventType === "response.output_text.delta") && typeof event.delta === "string") {
      currentAssistantLine += event.delta;
      return;
    }

    if (eventType === "response.output_audio_transcript.done" || eventType === "response.output_text.done") {
      const line = String(event.transcript ?? event.text ?? currentAssistantLine).trim();
      if (line) {
        transcriptEntries.push(`Agent: ${line}`);
      }
      currentAssistantLine = "";
      return;
    }

    if (eventType === "conversation.item.input_audio_transcription.completed") {
      const receiverText = String(event.transcript ?? "").trim();
      if (!receiverText) return;

      transcriptEntries.push(`Receiver: ${receiverText}`);
      const turn = planAgentTurn(receiverText, context, sessionState, supportedLanguages);
      sessionState = turn.state;
      updateRealtimeInstructions(realtimeWs, turn.instructions, {
        voice: resolveRealtimeVoice(agentSettings),
        model: env.openaiRealtimeModel
      });
      if (turn.plan.shouldRespond) {
        requestRealtimeResponse(realtimeWs, turn.instructions);
      }
      return;
    }

    if (eventType === "error") {
      console.error("OpenAI Realtime error", event);
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
      const transcriptText = transcriptEntries.join("\n").trim();
      const analyzedOutcome = await analyzeTranscriptWithOpenAI(transcriptText);
      const outcome =
        sessionState.dispositionHint && analyzedOutcome.disposition === "manual_review"
          ? {
              ...analyzedOutcome,
              disposition: sessionState.dispositionHint,
              next_action: mapDispositionToNextAction(sessionState.dispositionHint),
              summary_text: analyzedOutcome.summary_text || "Call completed with a deterministic fallback disposition."
            }
          : analyzedOutcome;
      await postVoiceOutcome({
        appBaseUrl: env.appBaseUrl,
        secret: env.voiceOutcomeSecret,
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

function parseChecklistValue(value: string) {
  return value
    .split(/\r?\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}
