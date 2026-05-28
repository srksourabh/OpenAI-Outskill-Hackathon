import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/config/env";
import { jsonError } from "@/lib/http";
import { isRetryEligible } from "@/domain/calls";
import { callOutcomeSchema } from "@/domain/voice-agent";
import { buildImprovementNote, detectReceiverAttitude } from "@/services/campaigns/engine";
import { updateCampaign } from "@/services/campaigns/file-store";

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
      const receiverAttitude = detectReceiverAttitude(body.transcript_text);
      const improvementNote = campaign.agent_settings.self_improve_enabled ? buildImprovementNote(body.transcript_text) : "";
      await updateCampaign(campaign.id, (current) => ({
        ...current,
        self_improvement_notes: improvementNote || current.self_improvement_notes,
        calls: current.calls.map((call) => {
          if (call.id !== body.call_id) return call;
          const status = call.status === "invalid_number" || call.status === "not_connected" || call.status === "not_picked" ? call.status : "completed";
          saved = true;
          return {
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
            receiver_attitude: receiverAttitude,
            improvement_note: improvementNote,
            status_history: [...call.status_history, { status, at: now, note: "Realtime voice outcome saved." }],
            updated_at: now
          };
        })
      }));
    }
    return NextResponse.json({ ok: saved });
  } catch (error) {
    return jsonError(error);
  }
}
