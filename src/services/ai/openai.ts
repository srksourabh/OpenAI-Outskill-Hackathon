import { env } from "@/config/env";
import { mapDispositionToNextAction } from "@/domain/calls";
import { callOutcomeSchema, type CallOutcome } from "@/domain/voice-agent";
import { classifyTranscript } from "./classifier";

const openAIOutcomeSchema = callOutcomeSchema.omit({ next_action: true });

const openAIOutcomeJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["disposition", "detected_language", "summary_text", "reason_code", "confidence"],
  properties: {
    disposition: {
      type: "string",
      enum: ["confirmed_pickup", "declined", "follow_up_needed", "manual_review", "voicemail", "not_picked", "not_connected", "invalid_number"]
    },
    detected_language: {
      type: "string",
      minLength: 2
    },
    summary_text: {
      type: "string",
      minLength: 1
    },
    reason_code: {
      anyOf: [{ type: "string" }, { type: "null" }]
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1
    }
  }
} as const;

const classifierInstructions = [
  "You classify outbound pickup-readiness call transcripts for an India-focused operations team.",
  "Return JSON only.",
  "Pick the best disposition from: confirmed_pickup, declined, follow_up_needed, manual_review, voicemail, not_picked, not_connected, invalid_number.",
  "Use follow_up_needed when the contact says the items are not ready or needs a later callback.",
  "Use declined only when the contact clearly refuses pickup or de-installation.",
  "Use manual_review when the transcript is too unclear to trust.",
  "Use ISO-style language tags when possible such as hi, en, bn, ta, te, mr, gu, pa, ml, kn, or, as.",
  "Keep summary_text short and operational.",
  "Set confidence between 0 and 1."
].join(" ");

type FetchLike = typeof fetch;

export async function analyzeTranscriptWithOpenAI(
  transcript: string,
  options: {
    apiKey?: string;
    model?: string;
    fetchImpl?: FetchLike;
  } = {}
): Promise<CallOutcome> {
  const fallbackOutcome = classifyTranscript(transcript);
  const text = transcript.trim();
  const apiKey = options.apiKey ?? env.openaiApiKey;

  if (!text || !apiKey || apiKey.startsWith("replace-with")) {
    return fallbackOutcome;
  }

  try {
    const response = await (options.fetchImpl ?? fetch)("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: options.model ?? env.openaiResponsesModel,
        instructions: classifierInstructions,
        input: `Classify this transcript:\n${text}`,
        max_output_tokens: 220,
        text: {
          format: {
            type: "json_schema",
            name: "call_outcome",
            strict: true,
            schema: openAIOutcomeJsonSchema
          }
        }
      }),
      signal: AbortSignal.timeout(15_000)
    });

    if (!response.ok) {
      throw new Error(`OpenAI Responses API returned ${response.status}.`);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const outputText = extractOutputText(payload);
    const rawOutcome = openAIOutcomeSchema.parse(JSON.parse(outputText));

    return {
      ...rawOutcome,
      next_action: mapDispositionToNextAction(rawOutcome.disposition)
    };
  } catch (error) {
    console.warn("OpenAI transcript analysis failed, using fallback classifier.", error);
    return fallbackOutcome;
  }
}

function extractOutputText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  const output = payload.output;
  if (!Array.isArray(output)) {
    throw new Error("OpenAI response did not include output_text.");
  }

  for (const item of output) {
    if (!item || typeof item !== "object" || !("content" in item)) continue;
    const content = item.content;
    if (!Array.isArray(content)) continue;

    for (const entry of content) {
      if (!entry || typeof entry !== "object") continue;
      if ("text" in entry && typeof entry.text === "string" && entry.text.trim()) {
        return entry.text;
      }
    }
  }

  throw new Error("OpenAI response did not contain parsable text output.");
}
