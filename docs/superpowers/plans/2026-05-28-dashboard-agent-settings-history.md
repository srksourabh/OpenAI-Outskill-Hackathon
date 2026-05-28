# Dashboard Agent Settings and Call History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dashboard-controlled voice, language, tone, prompt enhancement, self-improvement, and call history for future outbound calls.

**Architecture:** Store campaign-level agent settings plus per-call setting snapshots in the existing local campaign model. The dashboard updates settings through a small authenticated route, live start snapshots settings into calls, and the voice bridge uses those snapshots to create OpenAI Realtime sessions.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Vitest, existing local JSON store, Plivo AudioStream, OpenAI Realtime.

---

## File Map
- Modify `src/services/campaigns/types.ts`: add agent setting and call snapshot types.
- Modify `src/domain/voice-agent.ts`: add defaults, validation helpers, prompt guidance, and prompt enhancement support.
- Modify `src/services/campaigns/engine.ts`: initialize campaign settings and snapshot simulated calls.
- Modify `src/services/campaigns/live-start.ts`: snapshot settings and pass them to Plivo answer URLs.
- Modify `src/app/api/upload/route.ts`: accept initial agent settings during upload.
- Create `src/app/api/campaigns/[id]/settings/route.ts`: update future-call campaign settings.
- Modify `src/app/api/plivo/answer/route.ts`: forward settings to the voice bridge.
- Modify `src/voice-bridge/server.ts`: read settings and use the selected voice per call.
- Modify `src/app/campaigns/workspace.tsx`: add Agent Settings panel and transcript/history display.
- Modify `TASKS.md`: track new tasks and completion state.
- Add or modify tests in `tests/unit/voice-agent.test.ts` and `tests/unit/campaigns.test.ts`.

## Task 1: Add Agent Settings Domain Types

**Files:**
- Modify: `src/services/campaigns/types.ts`
- Modify: `src/domain/voice-agent.ts`
- Test: `tests/unit/voice-agent.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests that expect:
- default settings use `indian_female_natural`, `marin`, `warm`, empty prompt enhancement, and disabled self-improve.
- prompt instructions include tone, enhancement text, non-repetition, interruption, attitude adaptation, and self-improvement notes when provided.

Run:
```powershell
npm run test -- tests/unit/voice-agent.test.ts
```

Expected: FAIL because the new helpers and prompt text do not exist yet.

- [ ] **Step 2: Implement minimal domain support**

Add:
- `AgentSettings`
- `VoicePreset`
- `AgentTone`
- `getAgentSettings`
- `resolveRealtimeVoice`
- prompt builder support for `agentSettings` and `selfImprovementNotes`

- [ ] **Step 3: Re-run the unit test**

Run:
```powershell
npm run test -- tests/unit/voice-agent.test.ts
```

Expected: PASS.

## Task 2: Snapshot Settings on Campaign Calls

**Files:**
- Modify: `src/services/campaigns/types.ts`
- Modify: `src/services/campaigns/engine.ts`
- Modify: `src/services/campaigns/live-start.ts`
- Test: `tests/unit/campaigns.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests that expect:
- newly created campaigns have default agent settings.
- starting a campaign copies current settings into each new call.
- changing campaign settings after calls exist does not mutate existing call snapshots.

Run:
```powershell
npm run test -- tests/unit/campaigns.test.ts
```

Expected: FAIL because snapshots do not exist yet.

- [ ] **Step 2: Implement snapshots**

Add call fields for voice preset, voice ID, tone, prompt enhancement, receiver attitude, improvement note, and status history. Snapshot settings in both simulated and live start paths.

- [ ] **Step 3: Re-run the unit test**

Run:
```powershell
npm run test -- tests/unit/campaigns.test.ts
```

Expected: PASS.

## Task 3: Add Settings Update Route

**Files:**
- Create: `src/app/api/campaigns/[id]/settings/route.ts`
- Modify: `src/services/campaigns/file-store.ts`
- Test: service-level coverage in `tests/unit/campaigns.test.ts`

- [ ] **Step 1: Write failing validation test**

Add a test for a pure `mergeCampaignAgentSettings` helper that rejects unsupported language through normalization and clamps prompt enhancement length.

- [ ] **Step 2: Implement route and helper**

The route:
- requires admin auth
- parses JSON
- updates campaign-level settings only
- returns `{ campaign }`

- [ ] **Step 3: Re-run related tests**

Run:
```powershell
npm run test -- tests/unit/campaigns.test.ts tests/unit/voice-agent.test.ts
```

Expected: PASS.

## Task 4: Wire Settings Into Plivo and Realtime

**Files:**
- Modify: `src/services/campaigns/live-start.ts`
- Modify: `src/app/api/plivo/answer/route.ts`
- Modify: `src/voice-bridge/server.ts`
- Modify: `src/voice-bridge/openaiRealtime.ts` if needed
- Test: `tests/unit/voice-agent.test.ts`

- [ ] **Step 1: Write failing prompt/voice tests**

Expect selected call voice IDs and prompt enhancement to be used by `buildVoiceAgentInstructions`.

- [ ] **Step 2: Implement URL forwarding**

Pass `voicePreset`, `voiceId`, `tone`, `promptEnhancement`, and `selfImprovementNotes` from live start to answer URL to bridge URL.

- [ ] **Step 3: Use per-call voice in the bridge**

Read the query params in `src/voice-bridge/server.ts`, normalize settings, and call `connectOpenAIRealtime` with `resolveRealtimeVoice(settings)`.

- [ ] **Step 4: Re-run tests**

Run:
```powershell
npm run test -- tests/unit/voice-agent.test.ts
```

Expected: PASS.

## Task 5: Add Dashboard Controls and History

**Files:**
- Modify: `src/app/campaigns/workspace.tsx`

- [ ] **Step 1: Add typed campaign/call fields**

Extend the local client types to include `agent_settings`, `self_improvement_notes`, transcript text, snapshot fields, receiver attitude, improvement note, status history, and last call time.

- [ ] **Step 2: Add Agent Settings panel**

Render a selected-campaign settings form with voice preset, optional custom voice ID, language, tone, prompt enhancement, self-improve toggle, and save action calling `PATCH /api/campaigns/:id/settings`.

- [ ] **Step 3: Add history details**

Render transcript and status history in a `<details>` block for each mobile card and desktop row. Show live status, receiver attitude, setting snapshot, and transcript text.

- [ ] **Step 4: Manual UI sanity check**

Run:
```powershell
npm run lint
```

Expected: PASS with no TypeScript errors.

## Task 6: Update Tasks and Verify

**Files:**
- Modify: `TASKS.md`

- [ ] **Step 1: Update task list**

Add dashboard agent settings, future-call snapshots, prompt enhancement, self-improve, and call history tasks. Mark completed items only after verification.

- [ ] **Step 2: Run full verification**

Run:
```powershell
.\scripts\verify.ps1
```

Expected: PASS for lint, tests, and build.

## Self-Review
- Spec coverage: covered dashboard settings, future-call-only behavior, prompt enhancement, male/female voice presets, natural behavior, self-improve, live status, and transcript/history display.
- Placeholder scan: no implementation placeholders are left in the plan.
- Type consistency: settings fields use `agent_settings` on campaign and snapshot fields on calls.
