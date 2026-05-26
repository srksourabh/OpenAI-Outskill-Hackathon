# Memory Checkpoint

Last updated: 2026-05-27 00:21 IST

## Purpose
This file is the persistent resume point for the hackathon build. If the session crashes, context is compacted, or work resumes tomorrow, start here before editing code.

Do not store secrets in this file. Real API keys and credentials belong only in `.env` or deployment environment variables.

## Current Project
Outbound AI Calling Agent for pickup and de-installation readiness operations.

Core promise:

> Upload contacts, place outbound Plivo calls, let a humanized OpenAI Realtime voice agent talk to customers, capture readiness outcomes, and export operations-ready rows.

## Deadline
- MVP submission: 2026-05-27.
- Final product checkpoint: 2026-05-29.
- Complete launch/demo deadline: 2026-05-31 by 7:30 pm.

## Current Strategic Decision
The core MVP is not a robotic IVR. The product must show a dynamic LLM voice speaking during an actual customer call.

Approved architecture:
1. Next.js dashboard/API starts an outbound Plivo call.
2. Plivo fetches the app `answer_url` when the call is answered.
3. The `answer_url` returns bidirectional Plivo AudioStream XML.
4. A separate Node WebSocket voice bridge receives Plivo audio.
5. The bridge opens one OpenAI Realtime session per call.
6. OpenAI Realtime generates the humanized AI voice.
7. The bridge sends AI audio back to Plivo with `playAudio`.
8. Transcript, summary, disposition, and next action are saved to the database.
9. Dashboard shows the call outcome.
10. Simulated callback path remains available as demo fallback.

## Important Docs
Read these in this order when resuming:

1. `PRD.md` - product requirements.
2. `PLAN.md` - practical MVP and hackathon execution plan.
3. `design.md` - UI/UX design direction.
4. `docs/daily-summary-2026-05-26.md` - summary of yesterday's work.
5. `docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md` - approved realtime voice-agent spec.
6. `docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md` - exact implementation plan.
7. `TASKS.md` - current implementation checklist.

## Current Repo State
- Product, architecture, API, UI/UX, MVP plan, and realtime voice-agent planning docs exist.
- `.env` exists locally and should stay ignored.
- `.env.example` has placeholder environment values.
- The application stack has not been scaffolded yet.
- `scripts/verify.sh` currently runs, but reports no supported stack because there is no app scaffold yet.
- The next real work is implementation, starting from the Superpowers plan.

## Installed Skills and Workflows
- UI-UX-Pro-Max installed.
- PM skills installed from `srksourabh/pm-skills`.
- Superpowers skills installed from `srksourabh/superpowers`.
- Relevant Superpowers docs:
  - `brainstorming`
  - `writing-plans`
  - `executing-plans`
  - `subagent-driven-development`
  - `verification-before-completion`

## Today's Progress Log

### Step 1 - 2026-05-27 00:21 IST
- Created this `Memory.md` checkpoint.
- Recorded the current architecture decision and resume order.
- Confirmed implementation has not started yet.
- Next action is to begin Task 1 from `docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md`.

## Immediate Next Action
Start implementing the plan:

`docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md`

Begin with:

1. Scaffold Next.js App Router TypeScript app.
2. Add Tailwind CSS.
3. Add Vitest or equivalent test runner.
4. Update `scripts/setup.sh` and `scripts/verify.sh`.
5. Add environment validation.
6. Build Plivo answer XML as early as possible.
7. Build the Node WebSocket voice bridge early because it is the highest-risk demo dependency.

## Demo-Critical Path
For today's MVP, prioritize:

1. Plivo outbound call works.
2. Plivo answer URL returns bidirectional AudioStream XML.
3. Voice bridge receives Plivo `start` and `media` events.
4. Voice bridge connects to OpenAI Realtime.
5. Customer hears OpenAI voice through the phone.
6. Transcript or conservative summary is stored.
7. Dashboard shows status, disposition, next action, and summary.

Everything else is secondary until this path works.

## Safety Rules
- Never print, commit, or summarize real `.env` secrets.
- Do not depend on Vercel serverless for long-lived WebSocket audio.
- Use Railway, Render, Fly.io, or local `ngrok` for the voice bridge.
- Keep simulated callback fallback available for demo reliability.
- Use deterministic/manual-review fallback if live transcript extraction is uncertain.
- Protect any API that writes call outcomes.

## Verification Habit
After every meaningful change:
1. Run the relevant focused test.
2. Run `bash scripts/verify.sh` when possible.
3. Update `TASKS.md` if a checklist item is completed.
4. Update this `Memory.md` progress log with the step completed and the next action.

## Known Kluster Status
Kluster review attempts for private docs have been blocked by the approval layer because they would send private workspace data to an external service without explicit approval. Continue attempting required kluster review after file changes, but if blocked, use local verification and record that in the final response.
