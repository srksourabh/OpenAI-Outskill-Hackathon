# OpenAI Realtime Multilingual Voice Agent Design

## Status
Approved for planning.

## Problem
The current repository has a basic OpenAI Realtime bridge, but it does not yet behave like a production-shaped voice agent for outbound operations calls. It can stream audio and collect transcript text, but it lacks a reliable call-state machine, configurable operator controls, structured multilingual behavior, and a bounded semi-flexible conversation design.

The product needs a real OpenAI Realtime voice agent that can:
- open in English by default
- fall back to Hindi when needed
- switch to additional Indian languages only when explicitly requested
- stay inside a short operations workflow
- return auditable structured outcomes for the dashboard and exports

## Product Goal
Create an OpenAI Realtime outbound calling agent for pickup and de-installation readiness workflows that sounds natural, stays operationally focused, supports a controlled multilingual experience, and can be modified through the dashboard UI instead of hardcoded prompt edits alone.

## Approved Product Direction
Use a stateful server-side voice bridge with one OpenAI Realtime session per live phone call. Keep Vercel as the web and API system of record. Keep the always-on voice bridge on Railway or an equivalent host. Let the voice bridge manage call stages, language policy, interruption handling, transcript buffering, and outcome finalization.

The first designed version is:
- English-first at call opening
- Hindi as the fallback spoken language
- 4 to 6 additional Indian languages enabled through configuration
- explicit-request-only switching into non-English and non-Hindi languages
- semi-flexible ops conversation behavior

## Official Documentation Basis
This design is based on current official OpenAI Realtime documentation and the current codebase.

OpenAI references:
- `gpt-realtime` is the current general-availability realtime speech model.
- Realtime sessions support audio input and output over WebSocket.
- Realtime session behavior is configured with `session.update`.
- Semantic VAD is supported and appropriate for phone-call turn-taking.
- Prompting guidance recommends explicit language instructions when multilingual switching matters.

Reference URLs:
- https://platform.openai.com/docs/models/gpt-realtime
- https://platform.openai.com/docs/guides/realtime-models-prompting
- https://platform.openai.com/docs/guides/realtime-vad
- https://platform.openai.com/docs/guides/voice-agents
- https://platform.openai.com/docs/guides/realtime-conversations

Important naming note:
- The user asked for "OpenAI Realtime 2".
- The current official model line exposed in the docs is `gpt-realtime`.
- The design should therefore target the current Realtime API and keep the model configurable through environment and UI settings rather than inventing a non-existent hardcoded model name.

## Existing Repository Starting Point
The repo already contains an early version of this architecture:
- [src/voice-bridge/openaiRealtime.ts](../../../../src/voice-bridge/openaiRealtime.ts) opens a basic Realtime WebSocket session
- [src/voice-bridge/server.ts](../../../../src/voice-bridge/server.ts) bridges Plivo audio to OpenAI
- [src/domain/voice-agent.ts](../../../../src/domain/voice-agent.ts) defines outcome schema and minimal instructions

What is missing:
- explicit session state
- UI-configurable agent settings
- structured language packs
- stage-aware prompt orchestration
- detour handling policy
- interruption and timeout policy
- reusable prompt/profile generation
- confidence and manual-review routing rules during live operation

## Architecture

```text
Vercel Next.js app
  |
  | campaign config, dashboard, call records, exports
  v
Plivo outbound call
  |
  | answer URL fetch
  v
Vercel answer route returns AudioStream XML
  |
  | bidirectional audio stream
  v
Railway voice bridge
  |
  | one live call session object per call
  | one OpenAI Realtime session per call
  v
OpenAI Realtime
  |
  | speech output, transcript events, turn events
  v
Railway voice bridge stage evaluator
  |
  | structured outcome
  v
Vercel outcome endpoint
  |
  | persisted call result
  v
Dashboard, export, retry, manual review
```

### Responsibility Split

#### Vercel app
Responsible for:
- campaign creation and editing
- agent settings UI
- storing `agent_config` snapshots
- Plivo answer XML route
- campaign and call persistence
- transcript and outcome display
- exports
- admin controls

Not responsible for:
- long-lived call audio streaming
- in-call turn management

#### Voice bridge
Responsible for:
- accepting Plivo stream connections
- opening and managing OpenAI Realtime sessions
- maintaining per-call session state
- enforcing stage progression
- enforcing language policy
- handling short detours
- buffering transcript fragments
- finalizing structured outcomes

## Conversation Design
The voice agent is not a generic assistant. It is a bounded operations caller.

### Core call flow
1. opening greeting in English
2. identity and context confirmation
3. readiness question
4. short detour resolution if needed
5. one follow-up for unclear or not-ready cases
6. outcome confirmation
7. polite close

### Allowed behavior
- answer "who is calling?"
- answer "which company?"
- answer "which order?"
- accept "call later"
- accept "speak to manager"
- accept "wrong number"
- accept explicit language-switch requests
- ask one clarification question when the answer is ambiguous

### Disallowed behavior
- long support conversations
- pricing/refund negotiation
- pickup date promises not backed by data
- broad free-form chat
- repeated multi-minute clarification loops

### Operational goal
The agent should keep the live conversation natural while still driving toward one of the allowed structured outcomes:
- `confirmed_pickup`
- `follow_up_needed`
- `declined`
- `invalid_number`
- `not_connected`
- `voicemail`
- `manual_review`

## Multilingual Policy

### Opening and fallback hierarchy
1. primary opening language: English
2. fallback language: Hindi
3. additional enabled Indian languages: operator-selected

### Switching policy
- Start in English.
- Offer or move to Hindi when English is not working well.
- Switch to Bengali, Tamil, Telugu, Marathi, Gujarati, or other enabled languages only when the caller explicitly asks.
- Do not auto-switch into another Indian language just because the model hears mixed-language phrases.
- If the requested language is not enabled, politely offer English or Hindi.

### Supported first-wave language design
The design should support a configurable 6-language launch set. English and Hindi are full-priority languages. The additional 4 to 6 Indian languages are controlled-live languages.

Recommended shape:
- full live priority: `en`, `hi`
- controlled live: a chosen subset such as `bn`, `ta`, `te`, `mr`, `gu`

### Language pack model
Each supported language should be represented as a structured pack:
- code
- display name
- opening phrase
- readiness-question phrase
- follow-up phrase
- clarification phrase
- close-out phrase
- unsupported-request fallback copy

This avoids one giant prompt blob and makes the UI and bridge logic easier to reason about.

## UI Configuration Design
The operator should be able to modify voice agent behavior through the dashboard before starting a campaign.

### Required UI sections
1. `Language & Voice`
2. `Call Flow & Script`
3. `Classification & Outcomes`

### Recommended UI fields

#### Language & Voice
- opening language
- fallback language
- enabled switch languages
- language switching policy
- Realtime voice preset
- Realtime model setting

#### Call Flow & Script
- greeting style
- company intro text
- readiness question text
- follow-up question text
- allowed detour toggles
- max follow-up count
- close-out script
- strictness mode

#### Classification & Outcomes
- transcript analysis model
- manual-review confidence threshold
- disposition override rules
- preview of generated agent instructions

### UX rule
Operators should edit structured settings, not raw prompt blobs by default. The system should generate validated internal agent instructions from the structured UI configuration.

### Persistence rule
Each campaign must store an `agent_config` snapshot so that every call can later be audited against the exact language, script, and strictness settings used when that campaign ran.

## Realtime Session and State Machine
The bridge should keep one live session object per call.

### Per-call session data
- campaign id
- call id
- contact metadata
- `agent_config`
- current stage
- active language
- requested language history
- transcript buffer
- last user turn
- last agent turn
- interruption count
- clarification count
- detour type
- outcome candidate
- timestamps

### Recommended stages
- `opening`
- `identity_check`
- `readiness_question`
- `detour_resolution`
- `follow_up`
- `confirmation`
- `closing`
- `completed`
- `handoff_manual`

### Design principle
The bridge must track stage explicitly. The model should not be trusted to implicitly manage the full workflow by prompt alone.

### Per-turn loop
1. receive Plivo audio
2. send audio to OpenAI Realtime
3. collect transcript and output events
4. run a stage evaluator
5. decide whether to advance stage, repair, repeat, or hand off
6. update the call session state

### Guardrails
- maximum clarification loops
- silence timeout handling
- interruption handling
- unsupported-language handling
- wrong-number handling
- call-later handling
- manager-transfer handling

### Failure policy
- after two failed clarification loops, route to `handoff_manual`
- after repeated language mismatch, constrain the call back to English or Hindi
- if the recipient is clearly unrelated, mark the right business outcome and end quickly

## Prompt and Runtime Composition
The system prompt should be built from layered inputs instead of one hardcoded string.

### Prompt layers
1. stable system role
2. language policy block
3. call-stage instructions
4. business context block
5. operator-configured script fields
6. detour rules
7. closing rules

### Runtime implication
Because Realtime session behavior is updated through `session.update`, the bridge should be able to refresh stage-aware instructions without trying to swap the model mid-call. Voice and model changes should be treated as pre-call configuration, not normal in-call controls.

## Outcome and Transcript Design

### During the call
The bridge should collect:
- rolling transcript text
- detected explicit language requests
- stage transitions
- detour events
- interruption counts

### At call end
The bridge should run a structured outcome finalization step that returns:
- `disposition`
- `next_action`
- `detected_language`
- `summary_text`
- `reason_code`
- `confidence`
- optional `language_requested`
- optional `detour_type`

### Finalization strategy
- use Realtime for live speech
- use a structured post-call OpenAI analysis pass for final outcome extraction
- use deterministic fallback classification if the OpenAI result is missing or invalid
- route low-confidence or contradictory outcomes to `manual_review`

## Data Model Additions
The current call data should grow to include:
- `agent_config` snapshot per campaign
- optional `active_language`
- optional `language_requested`
- optional `detour_type`
- optional `clarification_count`
- optional `interruption_count`
- optional `stage_history`

These can start in flexible metadata fields before being normalized into dedicated tables if needed.

## Testing Strategy

### Unit tests
- language policy selection
- prompt builder behavior
- stage transition rules
- detour resolution rules
- manual-review threshold logic

### Integration tests
- Plivo stream event to bridge session updates
- Realtime event handling
- outcome posting back to Vercel
- campaign config to generated instructions

### Simulated call fixtures
- English ready
- English asks for Hindi
- Hindi confirms pickup
- explicit Bengali request
- explicit Tamil request
- wrong number
- call later
- manager handoff request
- unclear answer
- unsupported language request

### Manual end-to-end tests
- one real Plivo live call using English-first flow
- one Hindi fallback call
- one explicit additional-language request
- verify transcript, outcome, dashboard row, and export data

## Delivery Scope

### Phase 1
- stateful bridge session object
- English-first prompt system
- Hindi fallback
- explicit-request language switching
- operator-configurable agent settings UI
- transcript buffering
- structured outcome finalization

### Phase 2
- 4 to 6 additional Indian language packs
- richer detour handling
- stage history and audit UI
- confidence tuning

### Phase 3
- saved agent profiles
- A/B testing across prompts or voices
- role-based access for agent config editing

## Risks and Mitigations

### Risk: prompt-only agent drifts
Mitigation: keep stage control in the bridge.

### Risk: multilingual instability
Mitigation: explicit-request-only switching for non-English and non-Hindi languages.

### Risk: operator misconfiguration
Mitigation: structured validated UI fields with sensible defaults and a preview panel.

### Risk: low-confidence outcomes
Mitigation: manual-review threshold and deterministic fallback classifier.

### Risk: over-scope on all Indian languages
Mitigation: start with 6-language controlled support instead of trying to perfect every language at once.

## Acceptance Criteria
- The voice bridge opens one OpenAI Realtime session per live call.
- The agent opens in English by default.
- The agent can fall back to Hindi during the call.
- The agent switches to another enabled Indian language only on explicit request.
- The bridge tracks call stage explicitly instead of relying on prompt-only behavior.
- The dashboard exposes operator-editable agent settings before campaign start.
- Each campaign stores an `agent_config` snapshot.
- The bridge posts a structured outcome with confidence after each completed call.
- Low-confidence or contradictory calls route to `manual_review`.
- The dashboard and exports display the saved transcript and outcome data.

## Decision
Proceed with a stateful OpenAI Realtime multilingual outbound operations agent:
- English-first
- Hindi fallback
- controlled additional Indian language switching
- semi-flexible operations call flow
- UI-configurable agent settings
- Railway-hosted bridge and Vercel-hosted dashboard/API
