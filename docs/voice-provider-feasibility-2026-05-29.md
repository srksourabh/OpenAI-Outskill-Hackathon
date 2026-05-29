# Voice Provider Feasibility - 2026-05-29

## Recommendation
Keep OpenAI Realtime as the primary live call path for the MVP. It is the simplest architecture for low-latency speech-to-speech calls because the same session listens, reasons, speaks, manages interruptions, and emits transcript events.

Add Sarvam as the first serious India-voice fallback track after the demo. Sarvam is strong for Indian-language STT and TTS, but it changes the architecture into a pipeline: telephony audio -> STT -> LLM -> TTS -> telephony audio. That adds more moving parts and turn latency, but may improve Indian voice naturalness.

Evaluate ElevenLabs after Sarvam if the product needs premium global voice quality or SIP-based managed agents. ElevenLabs has strong low-latency TTS and realtime STT, but Indian-language breadth and operations fit should be tested against Hindi and code-mixed calls before replacing the current stack.

## Current Project Findings
- The bridge already uses WebSocket speech-to-speech: Plivo audio is forwarded to OpenAI Realtime, OpenAI audio deltas are returned to Plivo, and transcript text is posted back to the app on call close.
- The previous first-turn prompt forced the same opening line verbatim. That created the robotic repeated-starter problem.
- The Render template drifted from the product goal: it used English-first defaults and a shorter language list.
- Simulated campaigns were fixture-based. They proved dashboard results, but did not test the operator device mic and speaker.

## Decision Matrix
| Path | Latency | Voice naturalness | Transcript reliability | Integration risk | MVP fit |
|---|---:|---:|---:|---:|---|
| OpenAI Realtime | Best | Good | Good with realtime transcription model | Lowest | Best primary |
| Sarvam STT + LLM + TTS | Medium | Potentially best for Indian languages | Strong for Indian code-mix | Medium | Best fallback track |
| ElevenLabs STT + LLM + TTS | Medium | Strong global/premium voices | Good, requires testing for India ops | Medium-high | Pilot only |

## Implementation Direction
1. Keep OpenAI Realtime for live Plivo calls now.
2. Use `gpt-realtime-whisper` for realtime transcript capture.
3. Stop requiring a verbatim opening sentence; preserve meaning but let the model vary the first turn.
4. Keep browser mic/speaker rehearsal in the app so the team can test hardware and transcript readiness without making a paid telephony call.
5. If naturalness remains weak after prompt and config fixes, build a Sarvam pilot behind the same provider boundary before changing the production path.
