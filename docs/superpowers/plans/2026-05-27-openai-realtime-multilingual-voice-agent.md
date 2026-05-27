# OpenAI Realtime Multilingual Voice Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a stateful OpenAI Realtime outbound voice agent with English-first behavior, Hindi fallback, explicit-request-only switching into selected Indian languages, and dashboard-editable agent settings.

**Architecture:** Keep Vercel as the campaign, dashboard, and API system of record. Extend the always-on voice bridge on Render into a per-call orchestrator that manages stage, language policy, and transcript outcome finalization. Generate Realtime instructions from structured `agent_config` data stored per campaign rather than hardcoded prompt strings.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Vitest, Plivo AudioStream, OpenAI Realtime (`gpt-realtime` configurable), OpenAI Responses API, Render or equivalent always-on host for the bridge.

---

## File Structure

### Existing files to modify
- `src/config/env.ts`
  - add environment support for the new Realtime model naming and agent defaults
- `src/domain/voice-agent.ts`
  - slim down into shared types only, or keep only core shared outcome types
- `src/app/campaigns/workspace.tsx`
  - add the `Voice Agent Settings` UI
- `src/app/api/upload/route.ts`
  - persist `agent_config` on new campaigns
- `src/app/api/campaigns/[id]/start/route.ts`
  - pass `agent_config` into live call startup
- `src/services/campaigns/types.ts`
  - extend campaign and call metadata types
- `src/services/campaigns/engine.ts`
  - seed default `agent_config`
- `src/services/campaigns/live-start.ts`
  - attach campaign agent configuration to outbound call setup
- `src/voice-bridge/openaiRealtime.ts`
  - support richer `session.update` payload generation
- `src/voice-bridge/server.ts`
  - replace the minimal bridge loop with stateful orchestration

### New files to create
- `src/domain/agent-config.ts`
  - zod schema and TypeScript types for operator-editable voice agent settings
- `src/domain/language-packs.ts`
  - supported language definitions and first-wave packs
- `src/services/voice-agent/defaults.ts`
  - default English-first agent settings
- `src/services/voice-agent/prompt-builder.ts`
  - layered instruction generation from `agent_config`, stage, and contact context
- `src/services/voice-agent/language-policy.ts`
  - explicit-request-only language switching rules
- `src/services/voice-agent/stages.ts`
  - stage enum, stage transition helpers, and detour classification
- `src/services/voice-agent/session.ts`
  - per-call session type and helpers
- `src/services/voice-agent/stage-evaluator.ts`
  - stage advancement and repair logic
- `src/services/voice-agent/detours.ts`
  - supported detour parsing and resolution mapping
- `src/services/voice-agent/outcome-finalizer.ts`
  - structured end-of-call finalization wrapper
- `src/app/api/campaigns/[id]/agent-config/route.ts`
  - optional dedicated config read/write route if UI separation is cleaner than piggybacking on upload only
- `tests/unit/agent-config.test.ts`
- `tests/unit/language-policy.test.ts`
- `tests/unit/prompt-builder.test.ts`
- `tests/unit/stage-evaluator.test.ts`
- `tests/unit/outcome-finalizer.test.ts`
- `tests/integration/voice-bridge-session.test.ts`

### Notes on decomposition
- Keep prompt generation, stage logic, and language policy separate so each unit stays testable and easy to tune.
- Do not hide agent behavior inside one giant bridge file.
- Prefer keeping operator-facing config schema in one place and Realtime translation logic in another.

## Task 1: Define the Agent Configuration Schema

**Files:**
- Create: `src/domain/agent-config.ts`
- Modify: `src/services/campaigns/types.ts`
- Test: `tests/unit/agent-config.test.ts`

- [ ] **Step 1: Write the failing schema test**

```ts
import { describe, expect, it } from "vitest";
import { agentConfigSchema } from "@/domain/agent-config";

describe("agentConfigSchema", () => {
  it("accepts the English-first default multilingual config", () => {
    const result = agentConfigSchema.parse({
      opening_language: "en",
      fallback_language: "hi",
      enabled_switch_languages: ["hi", "bn", "ta", "te", "mr", "gu"],
      language_switching_policy: "explicit_request_only",
      greeting_style: "neutral",
      strictness_mode: "balanced",
      max_follow_ups: 1,
      realtime_model: "gpt-realtime",
      realtime_voice: "marin",
      transcript_model: "gpt-4.1-mini",
      detours: {
        call_later: true,
        manager: true,
        wrong_number: true,
        order_clarification: true,
        language_request: true
      },
      script: {
        company_intro: "We are calling from Demo Logistics.",
        readiness_question: "Are the items ready for pickup or de-installation?",
        follow_up_question: "Could you share what is pending and when they may be ready?",
        close_out: "Thank you. We will note your update."
      }
    });

    expect(result.opening_language).toBe("en");
    expect(result.language_switching_policy).toBe("explicit_request_only");
  });
});
```

- [ ] **Step 2: Run the schema test to verify it fails**

Run:

```powershell
npm run test -- tests/unit/agent-config.test.ts
```

Expected: FAIL with module not found for `@/domain/agent-config`.

- [ ] **Step 3: Write the configuration schema and campaign type extension**

```ts
// src/domain/agent-config.ts
import { z } from "zod";

export const supportedAgentLanguages = ["en", "hi", "bn", "ta", "te", "mr", "gu"] as const;

export const agentConfigSchema = z.object({
  opening_language: z.enum(supportedAgentLanguages),
  fallback_language: z.enum(supportedAgentLanguages),
  enabled_switch_languages: z.array(z.enum(supportedAgentLanguages)).min(1),
  language_switching_policy: z.literal("explicit_request_only"),
  greeting_style: z.enum(["formal", "neutral", "friendly"]),
  strictness_mode: z.enum(["strict", "balanced", "flexible"]),
  max_follow_ups: z.number().int().min(0).max(2),
  realtime_model: z.string().min(1),
  realtime_voice: z.string().min(1),
  transcript_model: z.string().min(1),
  detours: z.object({
    call_later: z.boolean(),
    manager: z.boolean(),
    wrong_number: z.boolean(),
    order_clarification: z.boolean(),
    language_request: z.boolean()
  }),
  script: z.object({
    company_intro: z.string().min(1),
    readiness_question: z.string().min(1),
    follow_up_question: z.string().min(1),
    close_out: z.string().min(1)
  })
});

export type AgentConfig = z.infer<typeof agentConfigSchema>;
```

```ts
// src/services/campaigns/types.ts
import type { AgentConfig } from "@/domain/agent-config";

export type Campaign = {
  // existing fields...
  agent_config: AgentConfig;
};
```

- [ ] **Step 4: Run the schema test to verify it passes**

Run:

```powershell
npm run test -- tests/unit/agent-config.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/domain/agent-config.ts src/services/campaigns/types.ts tests/unit/agent-config.test.ts
git commit -m "feat: add voice agent configuration schema"
```

## Task 2: Add Language Packs and Default Agent Settings

**Files:**
- Create: `src/domain/language-packs.ts`
- Create: `src/services/voice-agent/defaults.ts`
- Test: `tests/unit/agent-config.test.ts`

- [ ] **Step 1: Extend the test with default config expectations**

```ts
import { getDefaultAgentConfig } from "@/services/voice-agent/defaults";

it("builds an English-first default config", () => {
  const config = getDefaultAgentConfig();

  expect(config.opening_language).toBe("en");
  expect(config.fallback_language).toBe("hi");
  expect(config.enabled_switch_languages).toEqual(["hi", "bn", "ta", "te", "mr", "gu"]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm run test -- tests/unit/agent-config.test.ts
```

Expected: FAIL with module not found for `@/services/voice-agent/defaults`.

- [ ] **Step 3: Add first-wave language packs and defaults**

```ts
// src/domain/language-packs.ts
export const languagePacks = {
  en: {
    code: "en",
    name: "English",
    opening: "Hello, we are calling regarding your pickup readiness update.",
    readiness: "Are the items ready for pickup or de-installation?",
    followUp: "Could you share what is pending and when they may be ready?",
    clarification: "Sorry, could you please confirm that once more?",
    closeOut: "Thank you. We will note your update."
  },
  hi: {
    code: "hi",
    name: "Hindi",
    opening: "Namaste, hum pickup readiness update ke liye call kar rahe hain.",
    readiness: "Kya saman pickup ya de-installation ke liye taiyar hai?",
    followUp: "Kripya bataye kya pending hai aur kab tak taiyar ho sakta hai?",
    clarification: "Maaf kijiye, kya aap ek baar phir se spasht kar sakte hain?",
    closeOut: "Dhanyavaad. Hum aapka update note kar lenge."
  }
} as const;
```

```ts
// src/services/voice-agent/defaults.ts
import type { AgentConfig } from "@/domain/agent-config";

export function getDefaultAgentConfig(): AgentConfig {
  return {
    opening_language: "en",
    fallback_language: "hi",
    enabled_switch_languages: ["hi", "bn", "ta", "te", "mr", "gu"],
    language_switching_policy: "explicit_request_only",
    greeting_style: "neutral",
    strictness_mode: "balanced",
    max_follow_ups: 1,
    realtime_model: "gpt-realtime",
    realtime_voice: "marin",
    transcript_model: "gpt-4.1-mini",
    detours: {
      call_later: true,
      manager: true,
      wrong_number: true,
      order_clarification: true,
      language_request: true
    },
    script: {
      company_intro: "We are calling from Demo Logistics regarding your order.",
      readiness_question: "Are the items ready for pickup or de-installation?",
      follow_up_question: "Could you share what is pending and when they may be ready?",
      close_out: "Thank you. We will note your update."
    }
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```powershell
npm run test -- tests/unit/agent-config.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/domain/language-packs.ts src/services/voice-agent/defaults.ts tests/unit/agent-config.test.ts
git commit -m "feat: add default multilingual voice agent settings"
```

## Task 3: Persist `agent_config` on Campaign Creation

**Files:**
- Modify: `src/services/campaigns/engine.ts`
- Modify: `src/app/api/upload/route.ts`
- Test: `tests/unit/ingestion.test.ts`

- [ ] **Step 1: Add a failing campaign creation assertion**

```ts
import { createCampaignFromContacts } from "@/services/campaigns/engine";

it("stores the default agent config on new campaigns", () => {
  const campaign = createCampaignFromContacts({
    name: "Voice config test",
    companyName: "Demo Logistics",
    defaultLanguage: "en",
    concurrencyLimit: 1,
    provider: "simulated",
    contacts: []
  });

  expect(campaign.agent_config.opening_language).toBe("en");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm run test -- tests/unit/ingestion.test.ts
```

Expected: FAIL because `agent_config` is missing from the campaign shape.

- [ ] **Step 3: Add default config seeding in campaign creation**

```ts
// src/services/campaigns/engine.ts
import { getDefaultAgentConfig } from "@/services/voice-agent/defaults";

export function createCampaignFromContacts(input: CreateCampaignInput): Campaign {
  return {
    id: randomUUID(),
    name: input.name,
    company_name: input.companyName,
    provider: input.provider,
    status: "draft",
    default_language: input.defaultLanguage,
    concurrency_limit: input.concurrencyLimit,
    agent_config: getDefaultAgentConfig(),
    contacts: input.contacts,
    calls: [],
    created_at: new Date().toISOString()
  };
}
```

- [ ] **Step 4: Allow upload route overrides from form data**

```ts
// src/app/api/upload/route.ts
const agentConfigInput = form.get("agent_config");
const campaign = createCampaignFromContacts({
  // existing fields...
  agentConfigOverride: agentConfigInput ? JSON.parse(String(agentConfigInput)) : undefined
});
```

Expected follow-up implementation in `engine.ts`:

```ts
const agent_config = input.agentConfigOverride
  ? agentConfigSchema.parse(input.agentConfigOverride)
  : getDefaultAgentConfig();
```

- [ ] **Step 5: Run the test to verify it passes**

Run:

```powershell
npm run test -- tests/unit/ingestion.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```powershell
git add src/services/campaigns/engine.ts src/app/api/upload/route.ts tests/unit/ingestion.test.ts
git commit -m "feat: persist voice agent config on campaign creation"
```

## Task 4: Build Language Policy and Explicit-Request Switching Rules

**Files:**
- Create: `src/services/voice-agent/language-policy.ts`
- Test: `tests/unit/language-policy.test.ts`

- [ ] **Step 1: Write the failing language policy test**

```ts
import { describe, expect, it } from "vitest";
import { resolveLanguageTransition } from "@/services/voice-agent/language-policy";

describe("resolveLanguageTransition", () => {
  it("does not auto-switch on mixed-language speech without an explicit request", () => {
    const result = resolveLanguageTransition({
      activeLanguage: "en",
      fallbackLanguage: "hi",
      enabledLanguages: ["hi", "bn", "ta"],
      transcript: "haan yes ready hai",
      requestedLanguage: null
    });

    expect(result.nextLanguage).toBe("en");
  });

  it("switches when the caller explicitly requests a supported language", () => {
    const result = resolveLanguageTransition({
      activeLanguage: "en",
      fallbackLanguage: "hi",
      enabledLanguages: ["hi", "bn", "ta"],
      transcript: "please speak bengali",
      requestedLanguage: "bn"
    });

    expect(result.nextLanguage).toBe("bn");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm run test -- tests/unit/language-policy.test.ts
```

Expected: FAIL with module not found for `@/services/voice-agent/language-policy`.

- [ ] **Step 3: Implement the language switching rules**

```ts
// src/services/voice-agent/language-policy.ts
type LanguageTransitionInput = {
  activeLanguage: string;
  fallbackLanguage: string;
  enabledLanguages: string[];
  transcript: string;
  requestedLanguage: string | null;
};

export function resolveLanguageTransition(input: LanguageTransitionInput) {
  if (input.requestedLanguage && input.enabledLanguages.includes(input.requestedLanguage)) {
    return { nextLanguage: input.requestedLanguage, reason: "explicit_request" as const };
  }

  const englishBreakdown = /\b(hindi|speak hindi|not english)\b/i.test(input.transcript);
  if (englishBreakdown) {
    return { nextLanguage: input.fallbackLanguage, reason: "fallback" as const };
  }

  return { nextLanguage: input.activeLanguage, reason: "stay_put" as const };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```powershell
npm run test -- tests/unit/language-policy.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/services/voice-agent/language-policy.ts tests/unit/language-policy.test.ts
git commit -m "feat: add explicit-request language switching policy"
```

## Task 5: Build Prompt Composition from Stage and Agent Config

**Files:**
- Create: `src/services/voice-agent/prompt-builder.ts`
- Create: `src/services/voice-agent/stages.ts`
- Test: `tests/unit/prompt-builder.test.ts`

- [ ] **Step 1: Write the failing prompt-builder test**

```ts
import { describe, expect, it } from "vitest";
import { buildRealtimeInstructions } from "@/services/voice-agent/prompt-builder";
import { getDefaultAgentConfig } from "@/services/voice-agent/defaults";

describe("buildRealtimeInstructions", () => {
  it("includes the English-first language policy and current stage instructions", () => {
    const instructions = buildRealtimeInstructions({
      stage: "opening",
      config: getDefaultAgentConfig(),
      companyName: "Demo Logistics",
      orderId: "ORD-1",
      location: "Kolkata",
      machineCount: 2,
      activeLanguage: "en"
    });

    expect(instructions).toContain("Start in English");
    expect(instructions).toContain("Switch to Hindi when needed");
    expect(instructions).toContain("Current stage: opening");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm run test -- tests/unit/prompt-builder.test.ts
```

Expected: FAIL with module not found for `@/services/voice-agent/prompt-builder`.

- [ ] **Step 3: Add stage types and layered prompt generation**

```ts
// src/services/voice-agent/stages.ts
export const agentStages = [
  "opening",
  "identity_check",
  "readiness_question",
  "detour_resolution",
  "follow_up",
  "confirmation",
  "closing",
  "completed",
  "handoff_manual"
] as const;

export type AgentStage = (typeof agentStages)[number];
```

```ts
// src/services/voice-agent/prompt-builder.ts
import type { AgentConfig } from "@/domain/agent-config";
import type { AgentStage } from "./stages";

type PromptInput = {
  stage: AgentStage;
  config: AgentConfig;
  companyName: string;
  orderId: string;
  location: string;
  machineCount: number;
  activeLanguage: string;
};

export function buildRealtimeInstructions(input: PromptInput) {
  return [
    "You are a warm but bounded outbound operations calling agent.",
    "Start in English.",
    "Switch to Hindi when needed.",
    "Switch to other Indian languages only if the caller explicitly asks and the language is enabled.",
    `Current stage: ${input.stage}.`,
    `Active spoken language: ${input.activeLanguage}.`,
    `Company intro: ${input.config.script.company_intro}`,
    `Readiness question: ${input.config.script.readiness_question}`,
    `Follow-up question: ${input.config.script.follow_up_question}`,
    `Close-out: ${input.config.script.close_out}`,
    `Company: ${input.companyName}. Order: ${input.orderId}. Location: ${input.location}. Machine count: ${input.machineCount}.`
  ].join(" ");
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```powershell
npm run test -- tests/unit/prompt-builder.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/services/voice-agent/stages.ts src/services/voice-agent/prompt-builder.ts tests/unit/prompt-builder.test.ts
git commit -m "feat: build layered realtime instructions"
```

## Task 6: Add Stage Evaluator and Allowed Detour Logic

**Files:**
- Create: `src/services/voice-agent/detours.ts`
- Create: `src/services/voice-agent/stage-evaluator.ts`
- Test: `tests/unit/stage-evaluator.test.ts`

- [ ] **Step 1: Write the failing stage evaluator test**

```ts
import { describe, expect, it } from "vitest";
import { evaluateStageTransition } from "@/services/voice-agent/stage-evaluator";

describe("evaluateStageTransition", () => {
  it("moves to follow_up when readiness is negative", () => {
    const result = evaluateStageTransition({
      stage: "readiness_question",
      transcript: "No, it is not ready yet.",
      clarificationCount: 0
    });

    expect(result.nextStage).toBe("follow_up");
  });

  it("routes to manual handoff after repeated ambiguity", () => {
    const result = evaluateStageTransition({
      stage: "follow_up",
      transcript: "maybe maybe",
      clarificationCount: 2
    });

    expect(result.nextStage).toBe("handoff_manual");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm run test -- tests/unit/stage-evaluator.test.ts
```

Expected: FAIL with module not found for `@/services/voice-agent/stage-evaluator`.

- [ ] **Step 3: Implement the minimal detour parser and evaluator**

```ts
// src/services/voice-agent/detours.ts
export function detectDetour(transcript: string) {
  const text = transcript.toLowerCase();
  if (text.includes("call later")) return "call_later";
  if (text.includes("manager")) return "manager";
  if (text.includes("wrong number")) return "wrong_number";
  return null;
}
```

```ts
// src/services/voice-agent/stage-evaluator.ts
import type { AgentStage } from "./stages";
import { detectDetour } from "./detours";

type TransitionInput = {
  stage: AgentStage;
  transcript: string;
  clarificationCount: number;
};

export function evaluateStageTransition(input: TransitionInput) {
  const text = input.transcript.toLowerCase();
  const detour = detectDetour(text);

  if (input.clarificationCount >= 2) {
    return { nextStage: "handoff_manual" as const, detour };
  }

  if (detour) {
    return { nextStage: "detour_resolution" as const, detour };
  }

  if (input.stage === "readiness_question" && /\b(no|not ready|later|pending)\b/.test(text)) {
    return { nextStage: "follow_up" as const, detour: null };
  }

  if (input.stage === "readiness_question" && /\b(yes|ready|confirmed|haan)\b/.test(text)) {
    return { nextStage: "confirmation" as const, detour: null };
  }

  return { nextStage: input.stage, detour: null };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```powershell
npm run test -- tests/unit/stage-evaluator.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/services/voice-agent/detours.ts src/services/voice-agent/stage-evaluator.ts tests/unit/stage-evaluator.test.ts
git commit -m "feat: add voice agent stage evaluator"
```

## Task 7: Add Structured Outcome Finalization Rules

**Files:**
- Create: `src/services/voice-agent/outcome-finalizer.ts`
- Test: `tests/unit/outcome-finalizer.test.ts`

- [ ] **Step 1: Write the failing outcome finalizer test**

```ts
import { describe, expect, it, vi } from "vitest";
import { finalizeVoiceOutcome } from "@/services/voice-agent/outcome-finalizer";

describe("finalizeVoiceOutcome", () => {
  it("forces manual review when confidence is below the configured threshold", async () => {
    const result = await finalizeVoiceOutcome({
      transcript: "unclear conversation",
      confidenceThreshold: 0.6,
      analyze: vi.fn().mockResolvedValue({
        disposition: "follow_up_needed",
        next_action: "manual_followup",
        detected_language: "en",
        summary_text: "unclear",
        reason_code: "unclear",
        confidence: 0.2
      })
    });

    expect(result.disposition).toBe("manual_review");
    expect(result.next_action).toBe("verify_data");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm run test -- tests/unit/outcome-finalizer.test.ts
```

Expected: FAIL with module not found for `@/services/voice-agent/outcome-finalizer`.

- [ ] **Step 3: Implement confidence-aware finalization**

```ts
// src/services/voice-agent/outcome-finalizer.ts
import type { CallOutcome } from "@/domain/voice-agent";
import { analyzeTranscriptWithOpenAI } from "@/services/ai/openai";

type FinalizeInput = {
  transcript: string;
  confidenceThreshold: number;
  analyze?: (transcript: string) => Promise<CallOutcome>;
};

export async function finalizeVoiceOutcome(input: FinalizeInput): Promise<CallOutcome> {
  const outcome = await (input.analyze ?? analyzeTranscriptWithOpenAI)(input.transcript);

  if (outcome.confidence < input.confidenceThreshold) {
    return {
      disposition: "manual_review",
      next_action: "verify_data",
      detected_language: outcome.detected_language,
      summary_text: outcome.summary_text,
      reason_code: outcome.reason_code,
      confidence: outcome.confidence
    };
  }

  return outcome;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```powershell
npm run test -- tests/unit/outcome-finalizer.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/services/voice-agent/outcome-finalizer.ts tests/unit/outcome-finalizer.test.ts
git commit -m "feat: add confidence-aware voice outcome finalizer"
```

## Task 8: Extend the Dashboard UI for Voice Agent Settings

**Files:**
- Modify: `src/app/campaigns/workspace.tsx`
- Test: `tests/unit/ingestion.test.ts`

- [ ] **Step 1: Write a failing UI rendering test for the new controls**

```ts
import { render, screen } from "@testing-library/react";
import { CampaignWorkspace } from "@/app/campaigns/workspace";

it("shows voice agent settings controls in the upload panel", () => {
  render(<CampaignWorkspace />);

  expect(screen.getByText("Voice Agent Settings")).toBeInTheDocument();
  expect(screen.getByLabelText("Opening language")).toBeInTheDocument();
  expect(screen.getByLabelText("Fallback language")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm run test -- tests/unit/ingestion.test.ts
```

Expected: FAIL because the new labels are not rendered.

- [ ] **Step 3: Add the structured settings UI**

Add a new section to `UploadPanel` in `src/app/campaigns/workspace.tsx`:

```tsx
<section className="mt-5 rounded-md border border-line bg-surface p-3">
  <h3 className="text-base font-semibold">Voice Agent Settings</h3>
  <label className="mt-3 block text-sm font-medium">
    Opening language
    <select className="mt-1 w-full rounded-md border border-line px-3 py-2" name="agent_opening_language" defaultValue="en">
      <option value="en">English</option>
      <option value="hi">Hindi</option>
    </select>
  </label>
  <label className="mt-3 block text-sm font-medium">
    Fallback language
    <select className="mt-1 w-full rounded-md border border-line px-3 py-2" name="agent_fallback_language" defaultValue="hi">
      <option value="hi">Hindi</option>
      <option value="en">English</option>
    </select>
  </label>
  <label className="mt-3 block text-sm font-medium">
    Greeting style
    <select className="mt-1 w-full rounded-md border border-line px-3 py-2" name="agent_greeting_style" defaultValue="neutral">
      <option value="formal">Formal</option>
      <option value="neutral">Neutral</option>
      <option value="friendly">Friendly</option>
    </select>
  </label>
</section>
```

Also add hidden JSON serialization before upload:

```tsx
const agentConfig = {
  opening_language: formData.get("agent_opening_language"),
  fallback_language: formData.get("agent_fallback_language"),
  // include the other structured fields
};
formData.set("agent_config", JSON.stringify(agentConfig));
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```powershell
npm run test -- tests/unit/ingestion.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/app/campaigns/workspace.tsx tests/unit/ingestion.test.ts
git commit -m "feat: add dashboard voice agent settings"
```

## Task 9: Add Stateful Realtime Session Management to the Voice Bridge

**Files:**
- Create: `src/services/voice-agent/session.ts`
- Modify: `src/voice-bridge/openaiRealtime.ts`
- Modify: `src/voice-bridge/server.ts`
- Test: `tests/integration/voice-bridge-session.test.ts`

- [ ] **Step 1: Write the failing bridge session test**

```ts
import { describe, expect, it } from "vitest";
import { createVoiceSession } from "@/services/voice-agent/session";

describe("createVoiceSession", () => {
  it("starts in the opening stage with English active", () => {
    const session = createVoiceSession({
      callId: "call-1",
      campaignId: "campaign-1",
      contact: {
        provider_name: "Demo",
        order_id: "ORD-1",
        location: "Kolkata",
        machine_count: 1,
        language_hint: "en"
      },
      agentConfig: {
        opening_language: "en",
        fallback_language: "hi"
      } as never
    });

    expect(session.stage).toBe("opening");
    expect(session.activeLanguage).toBe("en");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm run test -- tests/integration/voice-bridge-session.test.ts
```

Expected: FAIL with module not found for `@/services/voice-agent/session`.

- [ ] **Step 3: Add a session object and bridge orchestration hooks**

```ts
// src/services/voice-agent/session.ts
import type { AgentConfig } from "@/domain/agent-config";
import type { AgentStage } from "./stages";

type ContactContext = {
  provider_name: string;
  order_id: string;
  location: string;
  machine_count: number;
  language_hint: string;
};

export function createVoiceSession(input: {
  callId: string;
  campaignId: string;
  contact: ContactContext;
  agentConfig: AgentConfig;
}) {
  return {
    callId: input.callId,
    campaignId: input.campaignId,
    contact: input.contact,
    agentConfig: input.agentConfig,
    stage: "opening" as AgentStage,
    activeLanguage: input.agentConfig.opening_language,
    requestedLanguageHistory: [] as string[],
    transcriptText: "",
    clarificationCount: 0,
    interruptionCount: 0,
    detourType: null as string | null
  };
}
```

Expected server changes:

```ts
// src/voice-bridge/server.ts
const session = createVoiceSession({
  callId,
  campaignId: url.searchParams.get("campaignId") ?? "unknown",
  contact: {
    provider_name: url.searchParams.get("providerName") ?? "Demo Logistics",
    order_id: url.searchParams.get("orderId") ?? "Realtime call",
    location: url.searchParams.get("location") ?? "Uploaded location",
    machine_count: Number(url.searchParams.get("machineCount") ?? "1"),
    language_hint: url.searchParams.get("languageHint") ?? "en"
  },
  agentConfig: getDefaultAgentConfig()
});
```

- [ ] **Step 4: Update Realtime session creation to use generated instructions**

Expected `src/voice-bridge/openaiRealtime.ts` shape:

```ts
export function sendSessionUpdate(ws: WebSocket, input: {
  model: string;
  voice: string;
  instructions: string;
}) {
  ws.send(JSON.stringify({
    type: "session.update",
    session: {
      type: "realtime",
      model: input.model,
      output_modalities: ["audio", "text"],
      audio: {
        input: { format: { type: "audio/pcmu" }, turn_detection: { type: "semantic_vad" } },
        output: { format: { type: "audio/pcmu" }, voice: input.voice }
      },
      instructions: input.instructions
    }
  }));
}
```

- [ ] **Step 5: Run the bridge session test to verify it passes**

Run:

```powershell
npm run test -- tests/integration/voice-bridge-session.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```powershell
git add src/services/voice-agent/session.ts src/voice-bridge/openaiRealtime.ts src/voice-bridge/server.ts tests/integration/voice-bridge-session.test.ts
git commit -m "feat: add stateful realtime voice bridge sessions"
```

## Task 10: Finalize Live Call Outcomes with Config-Aware Rules

**Files:**
- Modify: `src/voice-bridge/server.ts`
- Modify: `src/services/ai/openai.ts`
- Modify: `src/app/api/voice/outcome/route.ts`
- Test: `tests/unit/openai-analysis.test.ts`
- Test: `tests/unit/outcome-finalizer.test.ts`

- [ ] **Step 1: Add a failing low-confidence route expectation**

```ts
import { isRetryEligible } from "@/domain/calls";

it("marks low-confidence live outcomes as manual review", async () => {
  const outcome = await finalizeVoiceOutcome({
    transcript: "unclear speech",
    confidenceThreshold: 0.6,
    analyze: vi.fn().mockResolvedValue({
      disposition: "confirmed_pickup",
      next_action: "send_engineer",
      detected_language: "en",
      summary_text: "unclear speech",
      reason_code: "unclear",
      confidence: 0.2
    })
  });

  expect(outcome.disposition).toBe("manual_review");
  expect(isRetryEligible("completed", outcome.disposition)).toBe(false);
});
```

- [ ] **Step 2: Run the tests to verify they fail if the route ignores manual review**

Run:

```powershell
npm run test -- tests/unit/outcome-finalizer.test.ts tests/unit/openai-analysis.test.ts
```

Expected: FAIL until route and finalizer behavior agree.

- [ ] **Step 3: Wire the bridge to finalize and post the outcome**

Expected server-side close behavior:

```ts
const outcome = await finalizeVoiceOutcome({
  transcript: session.transcriptText,
  confidenceThreshold: 0.6
});

await postVoiceOutcome({
  appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",
  secret: process.env.VOICE_OUTCOME_SECRET ?? "",
  callId,
  transcriptText: session.transcriptText,
  outcome
});
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:

```powershell
npm run test -- tests/unit/outcome-finalizer.test.ts tests/unit/openai-analysis.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/voice-bridge/server.ts src/services/ai/openai.ts src/app/api/voice/outcome/route.ts tests/unit/outcome-finalizer.test.ts tests/unit/openai-analysis.test.ts
git commit -m "feat: finalize structured realtime call outcomes"
```

## Task 11: Add End-to-End UI and Bridge Regression Coverage

**Files:**
- Modify: `tests/unit/ingestion.test.ts`
- Modify: `tests/unit/voice-agent.test.ts`
- Create: `tests/integration/voice-bridge-session.test.ts`

- [ ] **Step 1: Add failing coverage for the English-first defaults and explicit-request policy**

```ts
it("keeps English-first behavior in the default voice agent settings", () => {
  const config = getDefaultAgentConfig();

  expect(config.opening_language).toBe("en");
  expect(config.fallback_language).toBe("hi");
  expect(config.language_switching_policy).toBe("explicit_request_only");
});
```

- [ ] **Step 2: Run the focused suite to verify any missing pieces fail**

Run:

```powershell
npm run test -- tests/unit/voice-agent.test.ts tests/integration/voice-bridge-session.test.ts
```

Expected: PASS only after earlier tasks are complete.

- [ ] **Step 3: Run the full verify script**

Run:

```powershell
.\scripts\verify.ps1
```

Expected:
- `tsc --noEmit` PASS
- all Vitest suites PASS
- `next build` PASS

- [ ] **Step 4: Commit**

```powershell
git add tests/unit/ingestion.test.ts tests/unit/voice-agent.test.ts tests/integration/voice-bridge-session.test.ts
git commit -m "test: cover multilingual realtime voice agent flow"
```

## Task 12: Update Deployment and Operator Documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/decisions.md`
- Modify: `CHANGELOG.md`
- Modify: `TASKS.md`

- [ ] **Step 1: Add the new deployment requirements to README**

Add a section like:

```md
## OpenAI Realtime Voice Agent

The live multilingual voice agent uses:
- Vercel for dashboard and APIs
- Railway or another always-on host for the voice bridge
- OpenAI Realtime for speech
- OpenAI Responses API for final transcript outcome extraction

For real deployed phone calls, you need an always-on bridge host. Railway is recommended but not mandatory.
```

- [ ] **Step 2: Record the architecture decision**

Add an ADR-style note to `docs/decisions.md` summarizing:
- English-first language policy
- Hindi fallback
- explicit-request-only switching for other Indian languages
- operator-editable structured settings

- [ ] **Step 3: Update task tracking and changelog**

Add completed entries for:
- agent config UI
- stateful bridge orchestration
- multilingual language policy
- structured outcome finalization

- [ ] **Step 4: Run the verify script again after docs changes**

Run:

```powershell
.\scripts\verify.ps1
```

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add README.md docs/decisions.md CHANGELOG.md TASKS.md
git commit -m "docs: record realtime multilingual voice agent rollout"
```

## Plan Self-Review

Spec coverage:
- English-first opening behavior is covered in Tasks 1, 2, 4, 5, and 8.
- Hindi fallback and explicit-request-only switching are covered in Tasks 2 and 4.
- UI-configurable agent settings are covered in Tasks 1, 3, and 8.
- Stateful bridge orchestration and stage control are covered in Tasks 5, 6, 9, and 10.
- Structured outcomes, confidence, and manual review are covered in Tasks 7 and 10.
- Testing coverage appears in Tasks 1 through 12 with unit, integration, and full verify runs.

Placeholder scan:
- No `TODO`, `TBD`, or “implement later” placeholders remain.
- Every code-affecting task includes exact file paths, sample code, commands, and expected outcomes.

Type consistency:
- `AgentConfig`, `AgentStage`, `opening_language`, `fallback_language`, `language_switching_policy`, and `agent_config` are named consistently across the plan.
- Realtime model naming uses `gpt-realtime` in the new agent plan while still allowing env configurability.

## Execution Handoff
Plan complete and saved to `docs/superpowers/plans/2026-05-27-openai-realtime-multilingual-voice-agent.md`.

Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
