# Realtime Plivo Voice Agent Design

## Status
Approved for planning.

## Deadline Context
- MVP submission: Wednesday, May 27, 2026.
- Final product checkpoint: Friday, May 29, 2026.
- Complete launch/demo: Sunday, May 31, 2026 by 7:30 pm.

## Problem
The core product is not a robotic IVR or a predefined voice script. The core product is a humanized AI calling agent that can call real customers, speak naturally, collect pickup or de-installation readiness details, and write structured outcomes to the database.

Operations teams currently call spreadsheet contacts manually. They need a faster way to confirm readiness, capture reasons, and export engineer-ready rows while preserving an audit trail.

## Target User
The primary user is an India-focused logistics or field operations manager who has a spreadsheet of customer or provider contacts and needs confirmed pickup/de-installation readiness.

Secondary users:
- Operations analyst reviewing call evidence and manual-review rows.
- Founder or hackathon judge evaluating whether the product can run a real call.
- Support operator using the dashboard to monitor calls and exports.

## Core Demo Promise
By tomorrow, the MVP must show at least one real Plivo outbound call where a human customer hears and responds to a dynamic LLM voice agent.

The demo must also preserve a fallback path: if live audio streaming fails during the presentation, simulated callbacks can still complete dashboard, classification, and export.

## Approved Product Direction
Use Plivo for outbound calling and bidirectional audio streaming. Use OpenAI Realtime for the humanized speech-to-speech agent. Use the application database to store contacts, calls, transcripts, summaries, dispositions, next actions, and provider event audit rows.

## Official Documentation Basis
- Plivo Voice Quickstart: outbound call creation uses a Plivo number, destination number, and `answer_url`; when answered, Plivo fetches XML instructions.
- Plivo AudioStream: bidirectional streaming lets the backend receive caller audio and send audio back through `playAudio`.
- OpenAI Realtime WebSocket: server-side Realtime sessions connect with a secure API key and stream audio through WebSocket events.
- OpenAI Realtime Conversations: the session controls model, voice, output modalities, audio format, VAD, and tools; the voice is selected before the first audio response.

Reference URLs:
- https://www.plivo.com/docs/voice/quickstart/quickstart
- https://docs.plivo.com/docs/voice/xml/audiostream
- https://docs.plivo.com/docs/voice/audio-streaming/overview
- https://platform.openai.com/docs/guides/realtime-websocket
- https://developers.openai.com/api/docs/guides/realtime-conversations

## Architecture

```text
Next.js dashboard/API
  |
  | POST /api/calls/start
  v
Plivo Calls API
  |
  | customer answers
  v
GET/POST /api/plivo/answer
  |
  | returns Plivo XML <Stream bidirectional="true">
  v
Plivo bidirectional AudioStream
  |
  | WebSocket media events
  v
Node voice bridge service
  |
  | server-to-server WebSocket
  v
OpenAI Realtime voice session
  |
  | audio deltas + transcript events + tool calls
  v
Node voice bridge service
  |
  | Plivo playAudio events
  v
Customer hears AI voice
```

## Service Boundary

### Next.js App
Responsible for:
- Admin dashboard.
- Contact/campaign/call APIs.
- Plivo call creation.
- Plivo answer XML endpoint.
- Plivo hangup/status webhook endpoints.
- Database reads and writes.
- CSV export.

Not responsible for:
- Long-lived WebSocket audio streaming.

### Voice Bridge Service
Responsible for:
- Accepting Plivo AudioStream WebSocket connections.
- Opening one OpenAI Realtime WebSocket session per call.
- Forwarding caller audio to OpenAI.
- Forwarding OpenAI output audio to Plivo.
- Capturing transcript fragments.
- Detecting call end.
- Sending structured call outcome back to the Next.js app.

This must run outside normal Vercel serverless routes. Use Railway, Render, Fly.io, or local `ngrok` for the hackathon.

## Voice Agent Behavior
The voice agent should sound warm, concise, and operationally useful. It should not read a rigid script line-by-line, but it should pursue a tightly bounded goal:

1. Introduce itself with company context.
2. Mention order ID, location, and machine/item count.
3. Ask whether pickup or de-installation is ready.
4. Ask one or two follow-up questions when needed:
   - If ready: confirm timing and any access constraints.
   - If not ready: ask reason and expected readiness date.
   - If unclear: ask one clarifying question.
5. End politely and briefly.
6. Produce structured outcome fields.

The agent must not:
- Promise engineer arrival times unless provided.
- Negotiate pricing, refunds, or support issues.
- Reveal secrets or internal system details.
- Continue indefinitely; target a 60 to 120 second call.

## Voice Selection
Select the voice in the OpenAI Realtime `session.update` payload before the first audio response.

Initial recommendation:
- Use `voice: "marin"` for the first demo because OpenAI documentation shows this voice in Realtime session examples.
- Keep the voice configurable through `OPENAI_REALTIME_VOICE`.

The UI can later expose a voice selector, but for tomorrow use an environment variable to avoid UI scope creep.

## Audio Format
For Plivo:
- Return `<Stream bidirectional="true" keepCallAlive="true" contentType="audio/x-mulaw;rate=8000">`.
- Receive Plivo `media.payload` chunks as base64 encoded audio.
- Send audio back to Plivo with `event: "playAudio"` and a `media` object.

For OpenAI Realtime:
- Use server-side WebSocket.
- Configure output audio in the session.
- Handle both documented audio delta event names defensively if the SDK/event naming differs.

If the exact audio format mismatch creates latency or playback issues, the implementation should add a small conversion utility between Plivo mu-law 8k audio and the Realtime session format. For the first pass, prefer a direct `audio/pcmu` path where supported.

## Database Outcome
Each call should write:
- `campaign_id`
- `contact_id`
- `provider`
- `provider_call_id`
- `stream_id`
- `status`
- `disposition`
- `next_action`
- `detected_language`
- `transcript_text`
- `summary_text`
- `reason_code`
- `recording_url`
- `confidence`
- `started_at`
- `ended_at`

Call events should append:
- provider event type
- raw payload
- idempotency key
- source: provider, realtime, system, simulated, admin
- created timestamp

## MVP Scope for Tomorrow

Must-have:
- One outbound Plivo call from dashboard/API.
- Answer URL returns bidirectional Stream XML.
- Voice bridge connects Plivo to OpenAI Realtime.
- Dynamic AI voice speaks to customer.
- Transcript fragments are captured.
- Call outcome is saved to database.
- Dashboard shows call row and outcome.
- Simulated fallback still works.

Not needed tomorrow:
- Full Excel upload polish.
- Multi-campaign advanced dashboard.
- Twilio or Exotel implementation.
- Production-grade retry cron.
- Perfect multilingual live conversation.
- Advanced voice selector UI.

## Friday Scope
- Persist full campaign/contact/call model.
- Add call detail page with transcript, summary, disposition, next action, and event timeline.
- Improve Plivo hangup and recording webhook handling.
- Add CSV export for confirmed and follow-up rows.
- Add basic tests for status mapping, outcome extraction, and Plivo XML generation.

## Sunday Scope
- Deploy dashboard and voice bridge.
- Prepare sample campaign and contact list.
- Prepare fallback simulation button.
- Add demo script and README.
- Run full rehearsal before 7:30 pm.

## Risks and Mitigations

### Risk: WebSocket hosting delay
Mitigation: run voice bridge locally with `ngrok` for tomorrow, then deploy to Railway/Render/Fly.io by Friday.

### Risk: Audio format mismatch
Mitigation: start with Plivo `audio/x-mulaw;rate=8000` and OpenAI Realtime `audio/pcmu` output where supported. Add conversion only if direct playback fails.

### Risk: Realtime model overtalks or rambles
Mitigation: use strict instructions, semantic VAD, a short call goal, and a max call duration.

### Risk: Customer gives unexpected answer
Mitigation: constrain the agent to one clarifying question and then mark `manual_review` if uncertain.

### Risk: Live call fails during judging
Mitigation: keep simulated callback path and seeded dashboard ready.

## Acceptance Criteria
- A test call can be started from an API or dashboard action.
- Plivo fetches our answer URL.
- The answer URL returns Stream XML, not Speak-only XML.
- The voice bridge receives Plivo `start` and `media` events.
- The OpenAI Realtime session sends at least one audio response.
- The customer hears the AI voice through the phone call.
- The transcript or conversation summary is saved.
- The call row has a disposition and next action after the call.
- The dashboard can show the result.

## Decision
Proceed with a real-time voice bridge MVP:
- Plivo outbound call and AudioStream.
- OpenAI Realtime as the speech-to-speech agent.
- Database-backed call results.
- Simulated fallback for demo resilience.
