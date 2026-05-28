import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/config/env";
import { jsonError } from "@/lib/http";
import { isRetryEligible } from "@/domain/calls";
import { callOutcomeSchema } from "@/domain/voice-agent";
import { buildImprovementNoteFromAttitude, classifyReceiverAttitude, evaluateCallBehaviorQuality, extractCallbackSchedule } from "@/services/campaigns/engine";
import { updateCampaign } from "@/services/campaigns/file-store";
import type { CallRecord } from "@/services/campaigns/types";

const bodySchema = z.object({
  call_id: z.string(),
  stream_id: z.string().nullable().optional(),
  transcript_text: z.string().default(""),
  outcome: callOutcomeSchema
});

export async function POST(request: Request) {
  try {
    if (request.headers.get("authorization") !== `Bearer ${env.voiceOutcomeSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = bodySchema.parse(await request.json());
    let saved = false;
    const now = new Date().toISOString();
    const campaigns = await import("@/services/campaigns/file-store").then((module) => module.listCampaigns());
    for (const campaign of campaigns) {
      if (!campaign.calls.some((call) => call.id === body.call_id)) continue;
      await updateCampaign(campaign.id, (current) => {
        let nextSelfImprovementNotes = current.self_improvement_notes;
        const calls = current.calls.map((call) => {
          if (call.id !== body.call_id) return call;
          const attitudeMatch = classifyReceiverAttitude(body.transcript_text);
          const improvementNote = current.agent_settings.self_improve_enabled ? buildImprovementNoteFromAttitude(attitudeMatch.attitude) : "";
          if (improvementNote) nextSelfImprovementNotes = improvementNote;
          const callbackSchedule = extractCallbackSchedule(body.transcript_text, now);
          const status: CallRecord["status"] =
            call.status === "invalid_number" || call.status === "not_connected" || call.status === "not_picked" ? call.status : "completed";
          const qaResult = evaluateCallBehaviorQuality({
            transcriptText: body.transcript_text,
            expectedLanguage: call.detected_language || current.default_language,
            detectedLanguage: body.outcome.detected_language,
            tone: call.tone_snapshot,
            receiverAttitude: attitudeMatch.attitude
          });
          saved = true;
          const updatedCall: CallRecord = {
            ...call,
            status,
            disposition: body.outcome.disposition,
            next_action: body.outcome.next_action,
            transcript_text: body.transcript_text,
            transcript_status: "realtime",
            summary_text: body.outcome.summary_text,
            reason_code: body.outcome.reason_code,
            confidence: body.outcome.confidence,
            detected_language: body.outcome.detected_language,
            retry_eligible: isRetryEligible(status, body.outcome.disposition),
            receiver_attitude: attitudeMatch.attitude,
            receiver_attitude_confidence: attitudeMatch.confidence,
            callback_requested_at: body.outcome.disposition === "follow_up_needed" ? callbackSchedule.callback_requested_at : null,
            callback_remarks: body.outcome.disposition === "follow_up_needed" ? callbackSchedule.callback_remarks : "",
            missed_call_note:
              status === "not_picked" || status === "not_connected" || body.outcome.disposition === "voicemail"
                ? body.outcome.summary_text
                : "",
            ...qaResult,
            improvement_note: improvementNote,
            status_history: [...call.status_history, { status, at: now, note: "Realtime voice outcome saved." }],
            updated_at: now
          };
          return updatedCall;
        });

        return {
          ...current,
          self_improvement_notes: nextSelfImprovementNotes,
          calls
        };
      });
    }
    return NextResponse.json({ ok: saved });
  } catch (error) {
    return jsonError(error);
  }
}
