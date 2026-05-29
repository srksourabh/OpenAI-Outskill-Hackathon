import { buildOpeningLine, buildVoiceAgentInstructions, type VoiceAgentContext, type VoiceAgentStage } from "@/domain/voice-agent";
import { getEffectiveLanguage, isSupportedLanguage, languageLabels, type LanguageCode } from "@/domain/languages";

type AgentSessionState = {
  stage: VoiceAgentStage;
  selectedLanguage: LanguageCode;
  followUpCount: number;
  dispositionHint: "confirmed_pickup" | "follow_up_needed" | "invalid_number" | "manual_review" | null;
  shouldClose: boolean;
};

export type AgentTurnPlan = {
  selectedLanguage: LanguageCode;
  stage: VoiceAgentStage;
  responseGoal: string;
  shouldRespond: boolean;
  shouldClose: boolean;
  dispositionHint: AgentSessionState["dispositionHint"];
};

const yesMarkers = ["yes", "haan", "ha", "ready", "available", "with me", "mere paas", "hai", "present"];
const noMarkers = ["not ready", "nahi", "nahin", "no", "later", "kal", "tomorrow", "after", "not with me", "not available"];
const wrongNumberMarkers = ["wrong number", "galat number", "not my machine", "who are you calling", "kisko", "unknown person"];
const callLaterMarkers = ["call later", "later", "baad mein", "baad me", "callback", "call back", "tomorrow", "kal"];

export function createAgentSessionState(languageHint: string): AgentSessionState {
  return {
    stage: "opening",
    selectedLanguage: getEffectiveLanguage(languageHint, "en"),
    followUpCount: 0,
    dispositionHint: null,
    shouldClose: false
  } satisfies AgentSessionState;
}

export function buildInitialAgentPrompt(context: VoiceAgentContext, state: AgentSessionState, supportedLanguages: LanguageCode[]) {
  const promptConfig = context.promptConfig;
  const requestType = promptConfig?.request_type?.trim() || "service";
  const callPurpose = promptConfig?.call_purpose?.trim() || "validate merchant details and confirm service readiness";

  return {
    instructions: buildVoiceAgentInstructions(context, {
      stage: state.stage,
      selectedLanguage: state.selectedLanguage,
      supportedLanguages,
      responseGoal: `Introduce yourself, mention the ${requestType} request and ${callPurpose}, then ask whether the request can proceed and the details are correct.`,
      latestReceiverReply: ""
    }),
    openingLine: buildOpeningLine(context)
  };
}

export function planAgentTurn(
  transcript: string,
  context: VoiceAgentContext,
  state: AgentSessionState,
  supportedLanguages: LanguageCode[]
) {
  const nextState = { ...state };
  const normalized = transcript.trim().toLowerCase();

  const requestedLanguage = detectRequestedLanguage(normalized, supportedLanguages);
  if (requestedLanguage) {
    nextState.selectedLanguage = requestedLanguage;
    nextState.stage = state.stage === "opening" ? "readiness_question" : state.stage;
    return buildTurnResult(
      nextState,
      context,
      supportedLanguages,
      transcript,
      `Acknowledge briefly, switch immediately to ${languageLabels[requestedLanguage]}, and continue with the same confirmation question without restarting the whole script.`
    );
  }

  if (!normalized) {
    return buildTurnResult(
      nextState,
      context,
      supportedLanguages,
      transcript,
      "Say you could not hear clearly and repeat the readiness question once."
    );
  }

  if (containsAny(normalized, wrongNumberMarkers)) {
    nextState.stage = "closing";
    nextState.dispositionHint = "invalid_number";
    nextState.shouldClose = true;
    return buildTurnResult(
      nextState,
      context,
      supportedLanguages,
      transcript,
      "Acknowledge the wrong number politely, apologize for the disturbance, and end the call."
    );
  }

  if (containsAny(normalized, yesMarkers) && !containsAny(normalized, noMarkers)) {
    nextState.stage = "closing";
    nextState.dispositionHint = "confirmed_pickup";
    nextState.shouldClose = true;
    return buildTurnResult(
      nextState,
      context,
      supportedLanguages,
      transcript,
      "Confirm that the request can proceed, briefly recap the confirmed details, thank them, and close politely."
    );
  }

  if (containsAny(normalized, noMarkers) || containsAny(normalized, callLaterMarkers)) {
    nextState.dispositionHint = "follow_up_needed";
    if (nextState.followUpCount >= 1) {
      nextState.stage = "closing";
      nextState.shouldClose = true;
      return buildTurnResult(
        nextState,
        context,
        supportedLanguages,
        transcript,
        "Acknowledge the reason or callback request, say the team will follow up, and end the call politely."
      );
    }

    nextState.stage = "follow_up";
    nextState.followUpCount += 1;
    return buildTurnResult(
      nextState,
      context,
      supportedLanguages,
      transcript,
      "Ask one short follow-up about the blocker, missing confirmation, or what callback time is better."
    );
  }

  nextState.stage = nextState.stage === "opening" ? "readiness_question" : nextState.stage;
  return buildTurnResult(
    nextState,
    context,
    supportedLanguages,
    transcript,
    "Clarify briefly who is calling and repeat the confirmation question in simple words."
  );
}

function buildTurnResult(
  state: AgentSessionState,
  context: VoiceAgentContext,
  supportedLanguages: LanguageCode[],
  transcript: string,
  responseGoal: string
) {
  return {
    state,
    plan: {
      selectedLanguage: state.selectedLanguage,
      stage: state.stage,
      responseGoal,
      shouldRespond: true,
      shouldClose: state.shouldClose,
      dispositionHint: state.dispositionHint
    } satisfies AgentTurnPlan,
    instructions: buildVoiceAgentInstructions(context, {
      stage: state.stage,
      selectedLanguage: state.selectedLanguage,
      supportedLanguages,
      responseGoal,
      latestReceiverReply: transcript
    })
  };
}

function detectRequestedLanguage(text: string, supportedLanguages: LanguageCode[]) {
  const entries: Array<[LanguageCode, string[]]> = [
    ["en", ["english", "speak english", "english me", "in english", "english please"]],
    ["hi", ["hindi", "speak hindi", "hindi me", "in hindi", "hindi mein"]],
    ["bn", ["bengali", "bangla", "bangla bolo", "bangla te"]],
    ["pa", ["punjabi", "punjabi me"]],
    ["gu", ["gujarati", "gujarati me"]],
    ["mr", ["marathi", "marathi me"]],
    ["ta", ["tamil", "tamil la", "tamil le", "in tamil"]],
    ["te", ["telugu", "telugu lo", "in telugu"]],
    ["ml", ["malayalam", "malayalam il"]],
    ["kn", ["kannada", "kannada dalli"]],
    ["or", ["odia", "oriya", "odia re"]],
    ["as", ["assamese", "assamese te"]]
  ];

  for (const [code, markers] of entries) {
    if (!supportedLanguages.includes(code)) continue;
    if (markers.some((marker) => text.includes(marker))) {
      return code;
    }
  }

  return null;
}

function containsAny(text: string, markers: string[]) {
  return markers.some((marker) => text.includes(marker));
}

export function normalizeSupportedLanguages(value: string[]) {
  return value.filter(isSupportedLanguage);
}
