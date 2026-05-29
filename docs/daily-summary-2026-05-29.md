# 2026-05-29 Progress Summary

## Completed
- Fixed voice-agent startup behavior so calls no longer force the same first sentence every time.
- Restored Hindi-first runtime defaults in Render templates and local env examples.
- Added `OPENAI_REALTIME_TRANSCRIPTION_MODEL=gpt-realtime-whisper` for live transcript capture.
- Added a Voice Lab route at `/campaigns/settings` for agent tuning and browser-based device rehearsal.
- Added browser speaker/mic simulation that captures transcript text and locally scores consent, availability, sentiment, goal capture, and next action.
- Added Codex-generated product visuals for the landing page and Voice Lab.
- Added voice provider feasibility notes comparing OpenAI Realtime, Sarvam, and ElevenLabs.
- Improved the health check so voice bridge misconfiguration explains the missing public Render WebSocket URL without leaking secrets.

## Verification
- TypeScript check passed with `tsc --noEmit`.
- Focused Vitest checks passed for health, voice agent, agent session, campaigns, and realtime config.
- Next.js production build passed.
- Browser verification covered `/health`, login, `/campaigns/settings`, and the Voice Lab panel.
- Render voice bridge health endpoint responded from `https://outbound-ai-calling-agent-voice-bridge.onrender.com/health`, though cold start delay remains visible on the free tier.

## Current Findings
- The Render voice bridge can be reachable while the web dashboard still shows `Voice bridge: WARN` if the web app does not have `VOICE_BRIDGE_PUBLIC_WS_URL` set to the public `wss://.../plivo/audio-stream` URL.
- The app should keep OpenAI Realtime as the primary MVP live-call architecture. Sarvam is the strongest next pilot for Indian voice naturalness. ElevenLabs is a later evaluation path for premium voice quality.
- Browser mic/speaker simulation is useful for device and transcript readiness, but a final live Plivo answered-call smoke test is still required for production confidence.

## Next Steps
- Set `VOICE_BRIDGE_PUBLIC_WS_URL=wss://outbound-ai-calling-agent-voice-bridge.onrender.com/plivo/audio-stream` in the deployed web app environment.
- Redeploy the web app and confirm `/health` moves Voice bridge from `WARN` to `OK`.
- Run one real Plivo answered-call smoke test and verify transcript, sentiment, consent/availability notes, and final outcome persistence.
- If live voice still sounds robotic after the non-verbatim opener fix, build a small Sarvam STT/TTS pilot behind the provider boundary before replacing the Realtime path.
