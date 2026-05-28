# Dashboard Agent Settings and Call History Design

## Goal
Operators can change voice, language, tone, prompt enhancement, and self-improvement settings from the dashboard. Changes apply only to future calls. The dashboard also shows live call status and call transcript/history for review.

## Scope
This spec extends the existing campaign dashboard and OpenAI Realtime voice bridge. It keeps the current Plivo plus OpenAI Realtime architecture and avoids adding a second TTS provider in this slice.

## Product Decisions
- Agent settings are campaign-level defaults.
- Setting changes apply only to calls created or started after the change.
- Each call stores a snapshot of the settings used at call start.
- Past call transcripts and setting snapshots are immutable evidence.
- OpenAI Realtime built-in voices are the MVP voice path.
- ElevenLabs custom voice IDs cannot be passed directly to OpenAI Realtime. External TTS support is a later architecture track.

## Agent Settings
Campaigns store:
- `voice_preset`: `indian_female_natural`, `indian_male_natural`, or `openai_custom`.
- `voice_id`: the OpenAI Realtime voice value or OpenAI custom voice ID.
- `tone`: `polite`, `warm`, `direct`, `patient`, or `assertive_respectful`.
- `prompt_enhancement`: operator-provided text appended to the system prompt at call start.
- `self_improve_enabled`: whether future calls can use short improvement guidance learned from previous calls.
- `self_improvement_notes`: compact campaign-level guidance generated from prior call outcomes.

Calls store:
- `voice_preset_snapshot`.
- `voice_id_snapshot`.
- `tone_snapshot`.
- `prompt_enhancement_snapshot`.
- `receiver_attitude`: `unknown`, `rude`, `polite`, `busy`, `confused`, `cooperative`, or `suspicious`.
- `improvement_note`: short note for future campaign guidance.
- `status_history`: timestamped status events for live display.

## Dashboard UX
Add an Agent Settings panel for the selected campaign:
- Voice preset select.
- Custom OpenAI voice ID input when preset is `openai_custom`.
- Default language select with all supported languages.
- Tone select.
- Prompt enhancement textarea.
- Self-improve toggle.
- Save button.

Show a compact read-only summary in the campaign metric band:
- voice preset
- tone
- default language
- self-improve state

Extend result rows/cards:
- live call status
- transcript availability
- receiver attitude
- last call time
- summary
- recording link

Add a transcript/history expander per result row:
- full transcript text
- status history timeline
- voice/tone/language snapshot
- prompt enhancement snapshot
- improvement note

## Voice Agent Behavior
The prompt builder must produce a natural phone agent:
- Speak in short sentences.
- Use natural Indian operations-caller style.
- Vary the introduction slightly across calls.
- Avoid repeating the same sentence when the receiver is confused or interrupts.
- Ask one question at a time.
- Listen when interrupted.
- Keep semantic VAD interruption enabled.
- Detect receiver attitude from transcript.
- Adapt style to attitude:
  - rude: calm, brief, no arguing
  - polite: warm and efficient
  - busy: ask for callback timing
  - confused: explain company and reason once
  - cooperative: proceed quickly
  - suspicious: identify company/reference and avoid over-talking

## OpenAI and ElevenLabs Voice Compatibility
OpenAI Realtime voice selection accepts OpenAI-supported voices and OpenAI custom voice objects. An ElevenLabs voice ID is not directly usable inside an OpenAI Realtime session.

If ElevenLabs is required later, build a separate provider path:
- OpenAI or another LLM for dialogue reasoning.
- STT for receiver audio.
- ElevenLabs streaming TTS for agent speech.
- Custom interruption handling and audio playback into Plivo.

That later path should be scoped separately because it changes latency, interruption behavior, and the audio pipeline.

## API Design
Add:
- `PATCH /api/campaigns/:id/settings`

Request:
```json
{
  "default_language": "hi",
  "voice_preset": "indian_female_natural",
  "voice_id": "marin",
  "tone": "warm",
  "prompt_enhancement": "Mention that this is about POS de-installation only.",
  "self_improve_enabled": true
}
```

Behavior:
- Requires admin auth.
- Validates language, voice preset, tone, prompt length, and voice ID length.
- Updates campaign defaults only.
- Does not mutate existing call snapshots.

## Realtime Bridge Flow
When a future call starts:
1. Campaign settings are copied into the call snapshot.
2. Plivo answer URL includes the snapshot values.
3. Voice bridge uses the snapshot voice ID and prompt settings when creating the OpenAI Realtime session.
4. Transcript entries are collected as they are today.
5. On close, transcript analysis sets disposition, receiver attitude, and improvement note.
6. If self-improve is enabled, campaign guidance is updated with a short note for future calls.

## Testing
Unit tests:
- default agent settings normalize safely.
- prompt builder includes tone, prompt enhancement, natural behavior rules, and self-improvement guidance.
- call start snapshots settings for future calls.
- settings update does not alter existing call snapshots.

Integration-style route tests or service tests:
- settings update validates supported languages and prompt length.
- live start passes voice/tone/prompt settings into callback URL.

## Acceptance Criteria
- Dashboard lets an operator update voice, language, tone, prompt enhancement, and self-improve settings for a selected campaign.
- Changes affect future calls only.
- Existing call snapshots remain unchanged after settings edits.
- OpenAI Realtime sessions use the call snapshot voice ID.
- Prompt enhancement is included in the system prompt at call time.
- Voice agent instructions include natural speech, interruption, non-repetition, attitude adaptation, and varied introduction guidance.
- Dashboard shows live call status and transcript/history details.
- TASKS.md tracks the new work.
