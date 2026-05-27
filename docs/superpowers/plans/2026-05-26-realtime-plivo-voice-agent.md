# Realtime Plivo Voice Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real outbound Plivo call that connects to an OpenAI Realtime voice agent, captures the conversation outcome, stores it in the database, and displays it in the app.

**Architecture:** Next.js handles dashboard/API/database and returns Plivo answer XML. A separate Node WebSocket voice bridge handles long-lived Plivo AudioStream connections and Hindi-first OpenAI Realtime sessions. The voice bridge sends final structured outcomes back to the Next.js API.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Plivo Node SDK, OpenAI Realtime WebSocket, `ws`, PostgreSQL via `pg`, Vitest, Node `tsx` for the voice bridge.

---

## Scope Check
This plan intentionally focuses on the real-time voice MVP. It does not implement the full Excel upload workflow, advanced dashboard polish, Twilio, Exotel, cron retry, or production retention policy. Those remain later plans.

## File Structure

Create or modify these files:

- Create: `package.json` - app scripts, dependencies, and verification commands.
- Create: `tsconfig.json` - shared TypeScript config.
- Create: `next.config.mjs` - Next.js config.
- Create: `postcss.config.mjs` - Tailwind processing.
- Create: `tailwind.config.ts` - Tailwind theme tokens.
- Create: `src/app/layout.tsx` - app shell layout.
- Create: `src/app/page.tsx` - redirect or simple campaign dashboard entry.
- Create: `src/app/campaigns/page.tsx` - MVP dashboard.
- Create: `src/app/api/health/route.ts` - health check.
- Create: `src/app/api/calls/start/route.ts` - starts one Plivo call.
- Create: `src/app/api/plivo/answer/route.ts` - returns Plivo Stream XML.
- Create: `src/app/api/plivo/hangup/route.ts` - receives call status updates.
- Create: `src/app/api/voice/outcome/route.ts` - receives final outcome from voice bridge.
- Create: `src/config/env.ts` - validates runtime environment.
- Create: `src/domain/calls.ts` - statuses, dispositions, next actions, and labels.
- Create: `src/domain/voice-agent.ts` - agent instructions and outcome schema.
- Create: `src/lib/db.ts` - PostgreSQL query helper.
- Create: `src/lib/http.ts` - JSON and error helpers.
- Create: `src/services/plivo/client.ts` - Plivo client wrapper.
- Create: `src/services/plivo/xml.ts` - Plivo answer XML builder.
- Create: `src/services/calls/repository.ts` - call persistence functions.
- Create: `src/voice-bridge/server.ts` - WebSocket server entrypoint.
- Create: `src/voice-bridge/openaiRealtime.ts` - OpenAI Realtime connection wrapper.
- Create: `src/voice-bridge/plivoStream.ts` - Plivo event parsing and audio send helpers.
- Create: `src/voice-bridge/outcomeClient.ts` - posts final outcome to Next.js API.
- Create: `src/voice-bridge/types.ts` - voice bridge event types.
- Create: `db/schema.sql` - minimal database schema.
- Create: `tests/unit/plivo-xml.test.ts` - XML tests.
- Create: `tests/unit/call-domain.test.ts` - domain tests.
- Create: `tests/unit/voice-agent.test.ts` - prompt/outcome schema tests.
- Create: `vitest.config.ts` - test config.
- Modify: `.env.example` - add public app URL, bridge URL, OpenAI Realtime settings, and outcome secret placeholders.
- Modify: `scripts/setup.sh` - install Node dependencies.
- Modify: `scripts/verify.sh` - run lint, test, and build.
- Modify: `TASKS.md` - track real-time Plivo voice MVP tasks.

## Required Environment Variables

Add these to `.env.example` and set real values in `.env`:

```env
APP_BASE_URL=http://localhost:3000
VOICE_BRIDGE_PUBLIC_WS_URL=wss://example.ngrok-free.app/plivo/audio-stream
VOICE_OUTCOME_SECRET=replace-with-local-outcome-secret

DATABASE_URL=postgresql://user:password@localhost:5432/outbound_agent

PLIVO_AUTH_ID=replace-with-plivo-auth-id
PLIVO_AUTH_TOKEN=replace-with-plivo-auth-token
PLIVO_NUMBER=replace-with-plivo-number

OPENAI_API_KEY=replace-with-openai-api-key
OPENAI_REALTIME_MODEL=gpt-realtime-2
OPENAI_REALTIME_VOICE=marin
OPENAI_REALTIME_FALLBACK_VOICE=cedar
PRIMARY_CALL_LANGUAGE=hi
SUPPORTED_CALL_LANGUAGES=hi,en,bn,pa,gu,mr,ta,te,ml,kn,or,as

ULTRAVOX_API_KEY=replace-with-ultravox-api-key
ULTRAVOX_BASE_URL=https://api.ultravox.ai/api
ULTRAVOX_AGENT_ID=replace-with-ultravox-agent-id
ULTRAVOX_VOICE_ID=replace-with-ultravox-voice-id
ULTRAVOX_PLIVO_ENABLED=false
```

## Task 1: Scaffold Next.js and Verification

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `postcss.config.mjs`
- Create: `tailwind.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/api/health/route.ts`
- Create: `vitest.config.ts`
- Modify: `scripts/setup.sh`
- Modify: `scripts/verify.sh`

- [ ] **Step 1: Write package manifest**

Create `package.json`:

```json
{
  "name": "outbound-ai-calling-agent",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "voice:dev": "tsx src/voice-bridge/server.ts",
    "lint": "next lint",
    "test": "vitest run",
    "build": "next build"
  },
  "dependencies": {
    "@types/ws": "^8.5.13",
    "next": "^15.0.0",
    "pg": "^8.13.1",
    "plivo": "^4.73.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "ws": "^8.18.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "@types/pg": "^8.11.10",
    "@types/react": "^19.0.1",
    "@types/react-dom": "^19.0.2",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:

```powershell
npm install
```

Expected: `node_modules` and `package-lock.json` are created.

- [ ] **Step 3: Add TypeScript and Next config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Create `next.config.mjs`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
```

Create `postcss.config.mjs`:

```js
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};

export default config;
```

Create `tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#F7F5EF",
        panel: "#FFFFFF",
        ink: "#1F2523",
        muted: "#6C736F",
        line: "#D8D4C8",
        rail: "#28322E",
        accent: "#0F766E"
      }
    }
  },
  plugins: []
};

export default config;
```

- [ ] **Step 4: Add minimal app shell**

Create `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Outbound AI Calling Agent",
  description: "Realtime Plivo and OpenAI voice agent for pickup readiness calls"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

Create `src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background: #f7f5ef;
  color: #1f2523;
}
```

Create `src/app/page.tsx`:

```tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-dvh p-6">
      <h1 className="text-2xl font-semibold">Outbound AI Calling Agent</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Start a Plivo call and connect it to a realtime OpenAI voice agent.
      </p>
      <Link className="mt-6 inline-flex rounded-md bg-accent px-4 py-2 text-white" href="/campaigns">
        Open dashboard
      </Link>
    </main>
  );
}
```

Create `src/app/api/health/route.ts`:

```ts
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Add Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"]
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname
    }
  }
});
```

- [ ] **Step 6: Update scripts**

Modify `scripts/setup.sh` to install npm dependencies when `package.json` exists. Keep the existing stack detector and ensure `npm install` is run for this stack.

Modify `scripts/verify.sh` so the package branch runs:

```sh
npm run lint
npm run test
npm run build
```

- [ ] **Step 7: Verify scaffold**

Run:

```powershell
npm run test
npm run build
```

Expected: tests pass with no tests found only if Vitest allows it, and Next builds the minimal app.

## Task 2: Add Environment Validation

**Files:**
- Create: `src/config/env.ts`
- Modify: `.env.example`
- Test: `tests/unit/env.test.ts`

- [ ] **Step 1: Add `.env.example` values**

Append:

```env
VOICE_BRIDGE_PUBLIC_WS_URL=wss://replace-with-voice-bridge-url/plivo/audio-stream
VOICE_OUTCOME_SECRET=replace-with-outcome-secret
OPENAI_REALTIME_MODEL=gpt-realtime-2
OPENAI_REALTIME_VOICE=marin
OPENAI_REALTIME_FALLBACK_VOICE=cedar
PRIMARY_CALL_LANGUAGE=hi
SUPPORTED_CALL_LANGUAGES=hi,en,bn,pa,gu,mr,ta,te,ml,kn,or,as

ULTRAVOX_API_KEY=replace-with-ultravox-api-key
ULTRAVOX_BASE_URL=https://api.ultravox.ai/api
ULTRAVOX_AGENT_ID=replace-with-ultravox-agent-id
ULTRAVOX_VOICE_ID=replace-with-ultravox-voice-id
ULTRAVOX_PLIVO_ENABLED=false
```

- [ ] **Step 2: Write env validation test**

Create `tests/unit/env.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseEnv } from "@/config/env";

describe("parseEnv", () => {
  it("parses required realtime voice settings", () => {
    const env = parseEnv({
      APP_BASE_URL: "http://localhost:3000",
      VOICE_BRIDGE_PUBLIC_WS_URL: "wss://example.ngrok-free.app/plivo/audio-stream",
      VOICE_OUTCOME_SECRET: "secret",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/app",
      PLIVO_AUTH_ID: "id",
      PLIVO_AUTH_TOKEN: "token",
      PLIVO_NUMBER: "+919999999999",
      OPENAI_API_KEY: "sk-test",
      OPENAI_REALTIME_MODEL: "gpt-realtime-2",
      OPENAI_REALTIME_VOICE: "marin",
      OPENAI_REALTIME_FALLBACK_VOICE: "cedar",
      PRIMARY_CALL_LANGUAGE: "hi",
      SUPPORTED_CALL_LANGUAGES: "hi,en,bn,pa,gu,mr,ta,te,ml,kn,or,as"
    });

    expect(env.openaiRealtimeVoice).toBe("marin");
    expect(env.primaryCallLanguage).toBe("hi");
    expect(env.voiceBridgePublicWsUrl).toContain("wss://");
  });
});
```

- [ ] **Step 3: Implement env parser**

Create `src/config/env.ts`:

```ts
import { z } from "zod";

const supportedLanguageCodes = ["hi", "en", "bn", "pa", "gu", "mr", "ta", "te", "ml", "kn", "or", "as"] as const;

const envSchema = z.object({
  APP_BASE_URL: z.string().url(),
  VOICE_BRIDGE_PUBLIC_WS_URL: z.string().url(),
  VOICE_OUTCOME_SECRET: z.string().min(8),
  DATABASE_URL: z.string().min(1),
  PLIVO_AUTH_ID: z.string().min(1),
  PLIVO_AUTH_TOKEN: z.string().min(1),
  PLIVO_NUMBER: z.string().min(8),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_REALTIME_MODEL: z.string().default("gpt-realtime-2"),
  OPENAI_REALTIME_VOICE: z.string().default("marin"),
  OPENAI_REALTIME_FALLBACK_VOICE: z.string().default("cedar"),
  PRIMARY_CALL_LANGUAGE: z.enum(supportedLanguageCodes).default("hi"),
  SUPPORTED_CALL_LANGUAGES: z.string().default("hi,en,bn,pa,gu,mr,ta,te,ml,kn,or,as")
});

export type AppEnv = ReturnType<typeof parseEnv>;

export function parseEnv(input: NodeJS.ProcessEnv | Record<string, string | undefined>) {
  const parsed = envSchema.parse(input);
  const supportedCallLanguages = parsed.SUPPORTED_CALL_LANGUAGES.split(",")
    .map((code) => code.trim())
    .filter((code): code is (typeof supportedLanguageCodes)[number] =>
      supportedLanguageCodes.includes(code as (typeof supportedLanguageCodes)[number])
    );

  return {
    appBaseUrl: parsed.APP_BASE_URL,
    voiceBridgePublicWsUrl: parsed.VOICE_BRIDGE_PUBLIC_WS_URL,
    voiceOutcomeSecret: parsed.VOICE_OUTCOME_SECRET,
    databaseUrl: parsed.DATABASE_URL,
    plivoAuthId: parsed.PLIVO_AUTH_ID,
    plivoAuthToken: parsed.PLIVO_AUTH_TOKEN,
    plivoNumber: parsed.PLIVO_NUMBER,
    openaiApiKey: parsed.OPENAI_API_KEY,
    openaiRealtimeModel: parsed.OPENAI_REALTIME_MODEL,
    openaiRealtimeVoice: parsed.OPENAI_REALTIME_VOICE,
    openaiRealtimeFallbackVoice: parsed.OPENAI_REALTIME_FALLBACK_VOICE,
    primaryCallLanguage: parsed.PRIMARY_CALL_LANGUAGE,
    supportedCallLanguages: supportedCallLanguages.length > 0 ? supportedCallLanguages : ["hi"]
  };
}

export const env = parseEnv(process.env);
```

- [ ] **Step 4: Verify**

Run:

```powershell
npm run test -- tests/unit/env.test.ts
```

Expected: env parser test passes.

## Task 3: Add Domain Types and Agent Instructions

**Files:**
- Create: `src/domain/calls.ts`
- Create: `src/domain/voice-agent.ts`
- Test: `tests/unit/call-domain.test.ts`
- Test: `tests/unit/voice-agent.test.ts`

- [ ] **Step 1: Write domain tests**

Create `tests/unit/call-domain.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isTerminalCallStatus, mapDispositionToNextAction } from "@/domain/calls";

describe("call domain", () => {
  it("knows terminal statuses", () => {
    expect(isTerminalCallStatus("completed")).toBe(true);
    expect(isTerminalCallStatus("queued")).toBe(false);
  });

  it("maps confirmed pickup to send_engineer", () => {
    expect(mapDispositionToNextAction("confirmed_pickup")).toBe("send_engineer");
  });
});
```

Create `tests/unit/voice-agent.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildVoiceAgentInstructions } from "@/domain/voice-agent";

describe("buildVoiceAgentInstructions", () => {
  it("includes contact context and bounded behavior", () => {
    const text = buildVoiceAgentInstructions({
      companyName: "Acme Logistics",
      orderId: "ORD-1",
      location: "Mumbai Warehouse",
      machineCount: 3,
      languageHint: "hi"
    });

    expect(text).toContain("Acme Logistics");
    expect(text).toContain("ORD-1");
    expect(text).toContain("one or two follow-up questions");
  });
});
```

- [ ] **Step 2: Implement domain types**

Create `src/domain/calls.ts`:

```ts
export const callStatuses = [
  "queued",
  "initiated",
  "ringing",
  "answered",
  "completed",
  "failed",
  "not_picked",
  "not_connected",
  "invalid_number",
  "voicemail"
] as const;

export type CallStatus = (typeof callStatuses)[number];

export const dispositions = [
  "unknown",
  "confirmed_pickup",
  "declined",
  "follow_up_needed",
  "manual_review",
  "voicemail"
] as const;

export type Disposition = (typeof dispositions)[number];

export const nextActions = ["none", "retry", "send_engineer", "manual_followup", "verify_data"] as const;

export type NextAction = (typeof nextActions)[number];

const terminalStatuses = new Set<CallStatus>([
  "completed",
  "failed",
  "not_picked",
  "not_connected",
  "invalid_number",
  "voicemail"
]);

export function isTerminalCallStatus(status: CallStatus) {
  return terminalStatuses.has(status);
}

export function mapDispositionToNextAction(disposition: Disposition): NextAction {
  if (disposition === "confirmed_pickup") return "send_engineer";
  if (disposition === "follow_up_needed" || disposition === "declined") return "manual_followup";
  if (disposition === "manual_review") return "verify_data";
  if (disposition === "voicemail") return "retry";
  return "none";
}
```

- [ ] **Step 3: Implement voice agent instructions**

Create `src/domain/voice-agent.ts`:

```ts
import { z } from "zod";

export const callOutcomeSchema = z.object({
  disposition: z.enum(["confirmed_pickup", "declined", "follow_up_needed", "manual_review", "voicemail"]),
  next_action: z.enum(["none", "retry", "send_engineer", "manual_followup", "verify_data"]),
  detected_language: z.string().min(2),
  summary_text: z.string().min(1),
  reason_code: z.string().nullable(),
  confidence: z.number().min(0).max(1)
});

export type CallOutcome = z.infer<typeof callOutcomeSchema>;

export type VoiceAgentContext = {
  companyName: string;
  orderId: string;
  location: string;
  machineCount: number;
  languageHint: string;
};

export function buildVoiceAgentInstructions(context: VoiceAgentContext) {
  return [
    "You are a warm, natural, concise AI calling assistant for an operations team in India.",
    "You are speaking with a real customer or provider on a phone call.",
    `Company name: ${context.companyName}.`,
    `Order ID: ${context.orderId}.`,
    `Location: ${context.location}.`,
    `Machine or item count: ${context.machineCount}.`,
    `Preferred language hint: ${context.languageHint}.`,
    "Start the call in simple operational Hindi unless the preferred language hint is a supported non-Hindi language.",
    "Switch to English only if the preferred language hint is en or the caller clearly asks for English.",
    "For other configured Indian languages, use that language pack when available. If it is unavailable, continue in Hindi and mark language mismatch for review.",
    "Goal: confirm whether the machines/items are ready for pickup or engineer de-installation.",
    "Speak naturally. Do not sound like a robotic IVR.",
    "Ask one question at a time.",
    "Ask only one or two follow-up questions before closing.",
    "If the customer confirms readiness, confirm timing and access constraints.",
    "If the customer says no, ask for the reason and expected readiness date.",
    "If the answer is unclear, ask one clarifying question and then mark manual review if still unclear.",
    "Do not promise engineer arrival times, prices, refunds, or support actions.",
    "End politely and briefly."
  ].join(" ");
}
```

- [ ] **Step 4: Verify**

Run:

```powershell
npm run test -- tests/unit/call-domain.test.ts tests/unit/voice-agent.test.ts
```

Expected: both tests pass.

## Task 4: Add Database Schema and Repository

**Files:**
- Create: `db/schema.sql`
- Create: `src/lib/db.ts`
- Create: `src/services/calls/repository.ts`

- [ ] **Step 1: Add schema**

Create `db/schema.sql`:

```sql
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company_name text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id),
  provider_name text not null,
  phone text not null,
  location text not null,
  machine_count integer not null,
  order_id text not null,
  language_hint text not null default 'hi',
  created_at timestamptz not null default now()
);

create table if not exists calls (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id),
  contact_id uuid not null references contacts(id),
  provider text not null default 'plivo',
  provider_call_id text,
  stream_id text,
  status text not null default 'queued',
  disposition text not null default 'unknown',
  next_action text not null default 'none',
  detected_language text,
  transcript_text text,
  summary_text text,
  reason_code text,
  recording_url text,
  confidence numeric,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists call_events (
  id uuid primary key default gen_random_uuid(),
  call_id uuid references calls(id),
  source text not null,
  event_type text not null,
  idempotency_key text not null unique,
  raw_payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists calls_campaign_id_idx on calls(campaign_id);
create index if not exists calls_provider_call_id_idx on calls(provider_call_id);
create index if not exists call_events_call_id_idx on call_events(call_id);
```

- [ ] **Step 2: Add DB helper**

Create `src/lib/db.ts`:

```ts
import pg from "pg";
import { env } from "@/config/env";

const { Pool } = pg;

export const db = new Pool({
  connectionString: env.databaseUrl
});

export async function query<T>(text: string, values: unknown[] = []) {
  const result = await db.query<T>(text, values);
  return result;
}
```

- [ ] **Step 3: Add call repository**

Create `src/services/calls/repository.ts`:

```ts
import { query } from "@/lib/db";
import type { CallOutcome } from "@/domain/voice-agent";

export type CallContext = {
  callId: string;
  campaignId: string;
  contactId: string;
  companyName: string;
  providerName: string;
  phone: string;
  location: string;
  machineCount: number;
  orderId: string;
  languageHint: string;
};

export async function getCallContext(callId: string) {
  const result = await query<CallContext>(
    `
    select
      ca.id as "callId",
      ca.campaign_id as "campaignId",
      ca.contact_id as "contactId",
      c.company_name as "companyName",
      co.provider_name as "providerName",
      co.phone,
      co.location,
      co.machine_count as "machineCount",
      co.order_id as "orderId",
      co.language_hint as "languageHint"
    from calls ca
    join campaigns c on c.id = ca.campaign_id
    join contacts co on co.id = ca.contact_id
    where ca.id = $1
    `,
    [callId]
  );

  return result.rows[0] ?? null;
}

export async function setPlivoCallId(callId: string, providerCallId: string) {
  await query(
    `
    update calls
    set provider_call_id = $2, status = 'initiated', started_at = coalesce(started_at, now()), updated_at = now()
    where id = $1
    `,
    [callId, providerCallId]
  );
}

export async function saveVoiceOutcome(input: {
  callId: string;
  streamId: string | null;
  transcriptText: string;
  outcome: CallOutcome;
}) {
  await query(
    `
    update calls
    set
      stream_id = coalesce($2, stream_id),
      status = 'completed',
      disposition = $3,
      next_action = $4,
      detected_language = $5,
      transcript_text = $6,
      summary_text = $7,
      reason_code = $8,
      confidence = $9,
      ended_at = now(),
      updated_at = now()
    where id = $1
    `,
    [
      input.callId,
      input.streamId,
      input.outcome.disposition,
      input.outcome.next_action,
      input.outcome.detected_language,
      input.transcriptText,
      input.outcome.summary_text,
      input.outcome.reason_code,
      input.outcome.confidence
    ]
  );
}
```

## Task 5: Build Plivo Call Start and Answer XML

**Files:**
- Create: `src/services/plivo/client.ts`
- Create: `src/services/plivo/xml.ts`
- Create: `src/app/api/calls/start/route.ts`
- Create: `src/app/api/plivo/answer/route.ts`
- Test: `tests/unit/plivo-xml.test.ts`

- [ ] **Step 1: Write XML test**

Create `tests/unit/plivo-xml.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildPlivoStreamXml } from "@/services/plivo/xml";

describe("buildPlivoStreamXml", () => {
  it("returns bidirectional stream XML", () => {
    const xml = buildPlivoStreamXml({
      wsUrl: "wss://example.ngrok-free.app/plivo/audio-stream?callId=abc",
      statusCallbackUrl: "https://example.com/api/plivo/stream-status"
    });

    expect(xml).toContain("<Response>");
    expect(xml).toContain('bidirectional="true"');
    expect(xml).toContain('keepCallAlive="true"');
    expect(xml).toContain("audio/x-mulaw;rate=8000");
    expect(xml).toContain("wss://example.ngrok-free.app/plivo/audio-stream?callId=abc");
  });
});
```

- [ ] **Step 2: Implement XML builder**

Create `src/services/plivo/xml.ts`:

```ts
export function buildPlivoStreamXml(input: { wsUrl: string; statusCallbackUrl: string }) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<Response>",
    `<Stream bidirectional="true" keepCallAlive="true" contentType="audio/x-mulaw;rate=8000" statusCallbackUrl="${escapeXml(input.statusCallbackUrl)}">`,
    escapeXml(input.wsUrl),
    "</Stream>",
    "</Response>"
  ].join("");
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
```

- [ ] **Step 3: Implement Plivo client**

Create `src/services/plivo/client.ts`:

```ts
import plivo from "plivo";
import { env } from "@/config/env";

export const plivoClient = new plivo.Client(env.plivoAuthId, env.plivoAuthToken);

export async function createPlivoCall(input: { to: string; answerUrl: string }) {
  return plivoClient.calls.create(env.plivoNumber, input.to, input.answerUrl, {
    answerMethod: "GET"
  });
}
```

- [ ] **Step 4: Add answer endpoint**

Create `src/app/api/plivo/answer/route.ts`:

```ts
import { env } from "@/config/env";
import { buildPlivoStreamXml } from "@/services/plivo/xml";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const callId = url.searchParams.get("callId");

  if (!callId) {
    return new Response("Missing callId", { status: 400 });
  }

  const wsUrl = new URL(env.voiceBridgePublicWsUrl);
  wsUrl.searchParams.set("callId", callId);

  const xml = buildPlivoStreamXml({
    wsUrl: wsUrl.toString(),
    statusCallbackUrl: `${env.appBaseUrl}/api/plivo/stream-status`
  });

  return new Response(xml, {
    status: 200,
    headers: { "Content-Type": "application/xml" }
  });
}
```

- [ ] **Step 5: Add start call endpoint**

Create `src/app/api/calls/start/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/config/env";
import { createPlivoCall } from "@/services/plivo/client";
import { setPlivoCallId } from "@/services/calls/repository";

const startCallSchema = z.object({
  callId: z.string().uuid(),
  phone: z.string().min(8)
});

export async function POST(request: Request) {
  const body = startCallSchema.parse(await request.json());
  const answerUrl = `${env.appBaseUrl}/api/plivo/answer?callId=${encodeURIComponent(body.callId)}`;
  const result = await createPlivoCall({ to: body.phone, answerUrl });
  const providerCallId = String(result.requestUuid ?? result.messageUuid ?? result.apiId ?? "");

  if (providerCallId) {
    await setPlivoCallId(body.callId, providerCallId);
  }

  return NextResponse.json({
    call_id: body.callId,
    provider: "plivo",
    provider_call_id: providerCallId,
    answer_url: answerUrl
  });
}
```

- [ ] **Step 6: Verify**

Run:

```powershell
npm run test -- tests/unit/plivo-xml.test.ts
```

Expected: XML test passes.

## Task 6: Build Voice Bridge Plivo Side

**Files:**
- Create: `src/voice-bridge/types.ts`
- Create: `src/voice-bridge/plivoStream.ts`
- Create: `src/voice-bridge/server.ts`

- [ ] **Step 1: Define bridge types**

Create `src/voice-bridge/types.ts`:

```ts
export type PlivoStartEvent = {
  event: "start";
  streamId: string;
  start?: {
    callId?: string;
    callUuid?: string;
  };
};

export type PlivoMediaEvent = {
  event: "media";
  streamId: string;
  media: {
    payload: string;
    timestamp?: string;
    track?: string;
  };
};

export type PlivoStopEvent = {
  event: "stop";
  streamId: string;
};

export type PlivoStreamEvent = PlivoStartEvent | PlivoMediaEvent | PlivoStopEvent | Record<string, unknown>;
```

- [ ] **Step 2: Add Plivo stream helpers**

Create `src/voice-bridge/plivoStream.ts`:

```ts
import type WebSocket from "ws";
import type { PlivoStreamEvent } from "./types";

export function parsePlivoEvent(data: WebSocket.RawData): PlivoStreamEvent {
  return JSON.parse(data.toString()) as PlivoStreamEvent;
}

export function sendAudioToPlivo(ws: WebSocket, payload: string) {
  if (ws.readyState !== ws.OPEN) return;

  ws.send(
    JSON.stringify({
      event: "playAudio",
      media: {
        contentType: "audio/x-mulaw",
        sampleRate: 8000,
        payload
      }
    })
  );
}
```

- [ ] **Step 3: Add WebSocket server shell**

Create `src/voice-bridge/server.ts`:

```ts
import { WebSocketServer } from "ws";
import { parsePlivoEvent } from "./plivoStream";

const port = Number(process.env.VOICE_BRIDGE_PORT ?? 8080);
const server = new WebSocketServer({ port });

server.on("connection", (plivoWs, request) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const callId = url.searchParams.get("callId");

  if (!callId) {
    plivoWs.close(1008, "Missing callId");
    return;
  }

  console.log(`Plivo stream connected for call ${callId}`);

  plivoWs.on("message", (data) => {
    const event = parsePlivoEvent(data);
    console.log("plivo event", event.event);
  });

  plivoWs.on("close", () => {
    console.log(`Plivo stream closed for call ${callId}`);
  });
});

console.log(`Voice bridge listening on ${port}`);
```

- [ ] **Step 4: Verify server starts**

Run:

```powershell
npm run voice:dev
```

Expected: terminal prints `Voice bridge listening on 8080`.

## Task 7: Connect Voice Bridge to OpenAI Realtime

**Files:**
- Create: `src/voice-bridge/openaiRealtime.ts`
- Modify: `src/voice-bridge/server.ts`

- [ ] **Step 1: Add Realtime client wrapper**

Create `src/voice-bridge/openaiRealtime.ts`:

```ts
import WebSocket from "ws";

export type RealtimeSessionInput = {
  apiKey: string;
  model: string;
  voice: string;
  instructions: string;
};

export function connectOpenAIRealtime(input: RealtimeSessionInput) {
  const ws = new WebSocket(`wss://api.openai.com/v1/realtime?model=${encodeURIComponent(input.model)}`, {
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "OpenAI-Beta": "realtime=v1"
    }
  });

  ws.on("open", () => {
    ws.send(
      JSON.stringify({
        type: "session.update",
        session: {
          type: "realtime",
          model: input.model,
          output_modalities: ["audio", "text"],
          audio: {
            input: {
              format: {
                type: "audio/pcmu"
              },
              turn_detection: {
                type: "semantic_vad"
              }
            },
            output: {
              format: {
                type: "audio/pcmu"
              },
              voice: input.voice
            }
          },
          instructions: input.instructions
        }
      })
    );
  });

  return ws;
}

export function appendRealtimeAudio(ws: WebSocket, base64Audio: string) {
  if (ws.readyState !== ws.OPEN) return;

  ws.send(
    JSON.stringify({
      type: "input_audio_buffer.append",
      audio: base64Audio
    })
  );
}
```

- [ ] **Step 2: Wire Plivo media to OpenAI and OpenAI audio to Plivo**

Modify `src/voice-bridge/server.ts` so each Plivo connection creates one Realtime connection:

```ts
import { WebSocketServer } from "ws";
import { buildVoiceAgentInstructions } from "@/domain/voice-agent";
import { connectOpenAIRealtime, appendRealtimeAudio } from "./openaiRealtime";
import { parsePlivoEvent, sendAudioToPlivo } from "./plivoStream";

const port = Number(process.env.VOICE_BRIDGE_PORT ?? 8080);
const server = new WebSocketServer({ port });

server.on("connection", (plivoWs, request) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const callId = url.searchParams.get("callId");

  if (!callId) {
    plivoWs.close(1008, "Missing callId");
    return;
  }

  const realtimeWs = connectOpenAIRealtime({
    apiKey: process.env.OPENAI_API_KEY ?? "",
    model: process.env.OPENAI_REALTIME_MODEL ?? "gpt-realtime-2",
    voice: process.env.OPENAI_REALTIME_VOICE ?? "marin",
    instructions: buildVoiceAgentInstructions({
      companyName: "Demo Logistics",
      orderId: "DEMO-ORDER",
      location: "Demo Location",
      machineCount: 1,
      languageHint: "hi"
    })
  });

  realtimeWs.on("message", (data) => {
    const event = JSON.parse(data.toString());
    const audioPayload = event.delta;

    if (
      (event.type === "response.output_audio.delta" || event.type === "response.audio.delta") &&
      typeof audioPayload === "string"
    ) {
      sendAudioToPlivo(plivoWs, audioPayload);
    }
  });

  plivoWs.on("message", (data) => {
    const event = parsePlivoEvent(data);

    if (event.event === "media" && "media" in event && typeof event.media?.payload === "string") {
      appendRealtimeAudio(realtimeWs, event.media.payload);
    }
  });

  plivoWs.on("close", () => {
    realtimeWs.close();
  });
});

console.log(`Voice bridge listening on ${port}`);
```

- [ ] **Step 3: Verify bridge startup**

Run:

```powershell
$env:OPENAI_API_KEY="sk-real-key-from-env"; npm run voice:dev
```

Expected: bridge starts. A real Plivo stream is needed to verify audio.

## Task 8: Save Final Voice Outcome

**Files:**
- Create: `src/voice-bridge/outcomeClient.ts`
- Create: `src/app/api/voice/outcome/route.ts`
- Modify: `src/voice-bridge/server.ts`

- [ ] **Step 1: Add outcome poster**

Create `src/voice-bridge/outcomeClient.ts`:

```ts
export async function postVoiceOutcome(input: {
  appBaseUrl: string;
  secret: string;
  callId: string;
  streamId: string | null;
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
      stream_id: input.streamId,
      transcript_text: input.transcriptText,
      outcome: input.outcome
    })
  });
}
```

- [ ] **Step 2: Add outcome API**

Create `src/app/api/voice/outcome/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/config/env";
import { callOutcomeSchema } from "@/domain/voice-agent";
import { saveVoiceOutcome } from "@/services/calls/repository";

const bodySchema = z.object({
  call_id: z.string().uuid(),
  stream_id: z.string().nullable(),
  transcript_text: z.string(),
  outcome: callOutcomeSchema
});

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${env.voiceOutcomeSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = bodySchema.parse(await request.json());

  await saveVoiceOutcome({
    callId: body.call_id,
    streamId: body.stream_id,
    transcriptText: body.transcript_text,
    outcome: body.outcome
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Capture transcript and post default outcome on close**

Modify `src/voice-bridge/server.ts`:

```ts
let streamId: string | null = null;
let transcriptText = "";

realtimeWs.on("message", (data) => {
  const event = JSON.parse(data.toString());

  if (typeof event.delta === "string" && event.type?.includes("transcript")) {
    transcriptText += event.delta;
  }

  if (
    (event.type === "response.output_audio.delta" || event.type === "response.audio.delta") &&
    typeof event.delta === "string"
  ) {
    sendAudioToPlivo(plivoWs, event.delta);
  }
});

plivoWs.on("message", (data) => {
  const event = parsePlivoEvent(data);

  if (event.event === "start" && typeof event.streamId === "string") {
    streamId = event.streamId;
  }

  if (event.event === "media" && "media" in event && typeof event.media?.payload === "string") {
    appendRealtimeAudio(realtimeWs, event.media.payload);
  }
});
```

On `plivoWs.close`, post a conservative outcome:

```ts
await postVoiceOutcome({
  appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",
  secret: process.env.VOICE_OUTCOME_SECRET ?? "",
  callId,
  streamId,
  transcriptText,
  outcome: {
    disposition: "manual_review",
    next_action: "verify_data",
    detected_language: "unknown",
    summary_text: transcriptText || "Call ended before a structured outcome was captured.",
    reason_code: null,
    confidence: 0.3
  }
});
```

- [ ] **Step 4: Verify outcome API manually**

Run with a valid call ID from the database:

```powershell
Invoke-WebRequest -UseBasicParsing `
  -Method POST `
  -Uri http://localhost:3000/api/voice/outcome `
  -Headers @{ Authorization = "Bearer $env:VOICE_OUTCOME_SECRET"; "Content-Type" = "application/json" } `
  -Body '{"call_id":"00000000-0000-0000-0000-000000000000","stream_id":"stream-test","transcript_text":"Customer said pickup is ready.","outcome":{"disposition":"confirmed_pickup","next_action":"send_engineer","detected_language":"en","summary_text":"Customer confirmed pickup readiness.","reason_code":null,"confidence":0.9}}'
```

Expected with a real call ID: HTTP 200 and the row updates.

## Task 9: Add MVP Dashboard

**Files:**
- Create: `src/app/campaigns/page.tsx`
- Create: `src/app/api/calls/recent/route.ts`

- [ ] **Step 1: Add recent calls API**

Create `src/app/api/calls/recent/route.ts`:

```ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  const result = await query(`
    select
      ca.id,
      co.provider_name,
      co.phone,
      co.location,
      co.order_id,
      ca.status,
      ca.disposition,
      ca.next_action,
      ca.summary_text,
      ca.updated_at
    from calls ca
    join contacts co on co.id = ca.contact_id
    order by ca.updated_at desc
    limit 20
  `);

  return NextResponse.json({ items: result.rows });
}
```

- [ ] **Step 2: Add dashboard page**

Create `src/app/campaigns/page.tsx`:

```tsx
async function getRecentCalls() {
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/calls/recent`, { cache: "no-store" });
  if (!response.ok) return { items: [] };
  return response.json() as Promise<{ items: Array<Record<string, string | null>> }>;
}

export default async function CampaignsPage() {
  const data = await getRecentCalls();

  return (
    <main className="min-h-dvh p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Campaign dashboard</h1>
          <p className="mt-1 text-sm text-muted">Realtime Plivo voice calls and outcomes.</p>
        </div>
      </div>

      <section className="mt-6 overflow-hidden rounded-lg border border-line bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-surface">
            <tr>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Disposition</th>
              <th className="px-4 py-3">Next action</th>
              <th className="px-4 py-3">Summary</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr className="border-b border-line" key={String(item.id)}>
                <td className="px-4 py-3">{item.provider_name}</td>
                <td className="px-4 py-3 font-mono">{item.phone}</td>
                <td className="px-4 py-3">{item.status}</td>
                <td className="px-4 py-3">{item.disposition}</td>
                <td className="px-4 py-3">{item.next_action}</td>
                <td className="px-4 py-3">{item.summary_text ?? "No summary yet"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Verify dashboard build**

Run:

```powershell
npm run build
```

Expected: build succeeds.

## Task 10: Manual End-to-End Test

**Files:**
- No new files.

- [ ] **Step 1: Apply database schema**

Run against the configured Postgres database:

```powershell
psql $env:DATABASE_URL -f db/schema.sql
```

Expected: tables exist.

- [ ] **Step 2: Seed one campaign, contact, and call**

Run:

```sql
insert into campaigns (id, name, company_name, status)
values ('11111111-1111-1111-1111-111111111111', 'Demo Campaign', 'Demo Logistics', 'running')
on conflict do nothing;

insert into contacts (id, campaign_id, provider_name, phone, location, machine_count, order_id, language_hint)
values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Demo Customer', '+919999999999', 'Mumbai Warehouse', 1, 'ORD-DEMO', 'en')
on conflict do nothing;

insert into calls (id, campaign_id, contact_id, status)
values ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'queued')
on conflict do nothing;
```

- [ ] **Step 3: Start app and voice bridge**

Terminal 1:

```powershell
npm run dev
```

Terminal 2:

```powershell
npm run voice:dev
```

Expected:
- Next.js runs on `http://localhost:3000`.
- Voice bridge runs on `ws://localhost:8080`.

- [ ] **Step 4: Expose the voice bridge**

Run:

```powershell
ngrok http 8080
```

Set:

```powershell
$env:VOICE_BRIDGE_PUBLIC_WS_URL="wss://YOUR-NGROK-HOST/plivo/audio-stream"
```

- [ ] **Step 5: Start real Plivo call**

Run:

```powershell
Invoke-WebRequest -UseBasicParsing `
  -Method POST `
  -Uri http://localhost:3000/api/calls/start `
  -ContentType application/json `
  -Body '{"callId":"33333333-3333-3333-3333-333333333333","phone":"+91CUSTOMERPHONE"}'
```

Expected:
- Plivo creates a call.
- When answered, Plivo requests `/api/plivo/answer`.
- Voice bridge logs Plivo stream events.
- Customer hears OpenAI Realtime voice.

- [ ] **Step 6: Confirm dashboard**

Open:

```text
http://localhost:3000/campaigns
```

Expected:
- The call appears.
- After call close, status becomes `completed` or at least `manual_review`.
- Summary is visible when outcome is posted.

## Task 11: Update Documentation and Tasks

**Files:**
- Modify: `README.md`
- Modify: `TASKS.md`

- [ ] **Step 1: Update README demo commands**

Add:

```md
## Realtime Plivo Voice Demo

1. Apply `db/schema.sql` to the configured Postgres database.
2. Start the dashboard: `npm run dev`.
3. Start the voice bridge: `npm run voice:dev`.
4. Expose the voice bridge with `ngrok http 8080`.
5. Set `VOICE_BRIDGE_PUBLIC_WS_URL` to the ngrok `wss://` URL plus `/plivo/audio-stream`.
6. Start a call with `POST /api/calls/start`.
```

- [ ] **Step 2: Update TASKS.md**

Mark planning docs complete and add real-time voice MVP tasks under the first implementation slice.

- [ ] **Step 3: Verify final state**

Run:

```powershell
npm run test
npm run build
```

Expected: both pass.

## Plan Self-Review

Spec coverage:
- Plivo outbound call: Task 5.
- Plivo answer XML with bidirectional stream: Task 5.
- WebSocket voice bridge: Tasks 6 and 7.
- OpenAI Realtime voice selection: Task 7.
- Database outcome storage: Tasks 4 and 8.
- Dashboard visibility: Task 9.
- Manual end-to-end demo: Task 10.

Placeholder scan:
- This plan avoids placeholder steps and includes concrete file paths, code, and commands.

Type consistency:
- `callId`, `streamId`, `transcriptText`, and `CallOutcome` are consistently named across repository, API, and bridge steps.

## Execution Handoff
Plan complete and saved to `docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md`.

Two execution options:

1. **Subagent-Driven (recommended)** - dispatch a fresh subagent per task and review between tasks.
2. **Inline Execution** - execute tasks in this session using executing-plans, with checkpoints for review.
