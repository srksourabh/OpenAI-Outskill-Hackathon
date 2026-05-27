export async function postVoiceOutcome(input: {
  appBaseUrl: string;
  secret: string;
  callId: string;
  transcriptText: string;
  outcome: {
    disposition: string;
    next_action: string;
    detected_language: string;
    summary_text: string;
    reason_code: string | null;
    confidence: number;
  };
}) {
  await fetch(`${input.appBaseUrl}/api/voice/outcome`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.secret}`
    },
    body: JSON.stringify({
      call_id: input.callId,
      stream_id: null,
      transcript_text: input.transcriptText,
      outcome: input.outcome
    })
  });
}
