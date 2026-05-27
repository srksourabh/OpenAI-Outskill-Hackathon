# Hosting Distribution and Shipping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the MVP with Vercel for the web app and APIs, Railway for the realtime voice bridge, Supabase for data, and Plivo routed to the correct public endpoints.

**Architecture:** The Next.js app runs on Vercel and owns the dashboard, upload/campaign/export APIs, provider webhooks, answer XML, and cron routes. The Node voice bridge runs as an always-on Railway service because it must keep bidirectional Plivo AudioStream and OpenAI Realtime WebSocket sessions open. Supabase stores campaign, contact, call, event, language, and export data.

**Tech Stack:** Vercel, Railway, Supabase Postgres, Plivo, OpenAI Realtime, Next.js App Router, Node WebSocket voice bridge.

---

## Hosting Decision

Use this split:

| System Piece | Host | Why |
|---|---|---|
| Admin portal | Vercel | Best fit for Next.js preview and production deployments. |
| API routes | Vercel | Uploads, campaign actions, exports, webhooks, and cron are request/response workloads. |
| Cron retry/reconcile | Vercel Cron | Scheduled HTTP routes fit Vercel well. |
| Realtime voice bridge | Railway | Needs a persistent Node process and long-lived WebSocket sessions. |
| Database | Supabase Postgres | Hosted Postgres with SQL migrations and simple operational visibility. |
| Telephony | Plivo | Existing provider for outbound calls and AudioStream. |

## Endpoint Map

| Purpose | Public URL |
|---|---|
| Portal | `https://<vercel-app-domain>/campaigns` |
| Health | `https://<vercel-app-domain>/api/health` |
| Plivo answer URL | `https://<vercel-app-domain>/api/plivo/answer` |
| Plivo hangup/status URL | `https://<vercel-app-domain>/api/plivo/hangup` |
| Plivo recording URL | `https://<vercel-app-domain>/api/plivo/recording` |
| Voice outcome callback | `https://<vercel-app-domain>/api/voice/outcome` |
| Voice bridge stream URL | `wss://<railway-service-domain>/plivo/audio-stream` |

## Environment Variable Map

### Vercel

```env
APP_ENV=production
APP_BASE_URL=https://<vercel-app-domain>
VOICE_BRIDGE_PUBLIC_WS_URL=wss://<railway-service-domain>/plivo/audio-stream
VOICE_OUTCOME_SECRET=<same-secret-as-railway>
CRON_SECRET=<strong-random-secret>
DATABASE_URL=<supabase-connection-string>
OPENAI_API_KEY=<openai-api-key>
OPENAI_REALTIME_MODEL=gpt-realtime-2
OPENAI_REALTIME_VOICE=marin
OPENAI_REALTIME_FALLBACK_VOICE=cedar
PRIMARY_CALL_LANGUAGE=hi
SUPPORTED_CALL_LANGUAGES=hi,en,bn,pa,gu,mr,ta,te,ml,kn,or,as
TELEPHONY_PROVIDER=plivo
PLIVO_AUTH_ID=<plivo-auth-id>
PLIVO_AUTH_TOKEN=<plivo-auth-token>
PLIVO_NUMBER=<plivo-number>
PLIVO_WEBHOOK_SECRET=<plivo-webhook-secret>
```

### Railway

```env
APP_ENV=production
APP_BASE_URL=https://<vercel-app-domain>
VOICE_OUTCOME_SECRET=<same-secret-as-vercel>
VOICE_BRIDGE_PORT=8080
OPENAI_API_KEY=<openai-api-key>
OPENAI_REALTIME_MODEL=gpt-realtime-2
OPENAI_REALTIME_VOICE=marin
OPENAI_REALTIME_FALLBACK_VOICE=cedar
PRIMARY_CALL_LANGUAGE=hi
SUPPORTED_CALL_LANGUAGES=hi,en,bn,pa,gu,mr,ta,te,ml,kn,or,as
```

## Task 1: Add Deployment Configuration

**Files:**
- Create: `vercel.json`
- Create: `railway.json`
- Modify: `package.json`

- [ ] **Step 1: Add Vercel cron config**

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/retry-unanswered",
      "schedule": "*/10 * * * *"
    },
    {
      "path": "/api/cron/reconcile-provider-status",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

- [ ] **Step 2: Add Railway service config**

Create `railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "deploy": {
    "startCommand": "npm run voice:start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

- [ ] **Step 3: Add production voice bridge script**

Modify `package.json` scripts:

```json
{
  "scripts": {
    "voice:dev": "tsx src/voice-bridge/server.ts",
    "voice:start": "tsx src/voice-bridge/server.ts"
  }
}
```

- [ ] **Step 4: Verify config files**

Run:

```powershell
npm run build
```

Expected: Next.js build succeeds and deployment config files are present.

## Task 2: Deploy Vercel Web App

**Files:**
- No source files.

- [ ] **Step 1: Create Vercel project**

Run:

```powershell
npx vercel --version
```

Expected: Vercel CLI prints a version.

- [ ] **Step 2: Set Vercel environment variables**

Set the Vercel variables from the Vercel environment map above. Do not print real secret values in logs or docs.

- [ ] **Step 3: Deploy preview**

Run:

```powershell
npx vercel
```

Expected: Vercel returns a preview URL.

- [ ] **Step 4: Smoke test health route**

Run:

```powershell
Invoke-WebRequest -UseBasicParsing https://<preview-domain>/api/health
```

Expected: HTTP 200 with a JSON body containing `"ok":true`.

## Task 3: Deploy Railway Voice Bridge

**Files:**
- No source files.

- [ ] **Step 1: Create Railway service**

Create a Railway service from the same repository and configure it to use `railway.json`.

- [ ] **Step 2: Set Railway environment variables**

Set the Railway variables from the Railway environment map above. `VOICE_OUTCOME_SECRET` must exactly match Vercel.

- [ ] **Step 3: Deploy bridge**

Deploy the service and confirm the logs include:

```text
Voice bridge listening on 8080
```

- [ ] **Step 4: Copy public WebSocket URL**

Set Vercel `VOICE_BRIDGE_PUBLIC_WS_URL` to:

```text
wss://<railway-service-domain>/plivo/audio-stream
```

Expected: new Vercel deployments generate Plivo answer XML with the Railway `wss://` URL.

## Task 4: Configure Supabase

**Files:**
- No source files.

- [ ] **Step 1: Create Supabase project**

Create one MVP production Supabase project.

- [ ] **Step 2: Apply migrations**

Run the project migration command once migrations exist:

```powershell
npx supabase db push
```

Expected: campaign, contact, call, event, language, and export tables exist.

- [ ] **Step 3: Set Vercel database URL**

Set `DATABASE_URL` in Vercel to the Supabase connection string.

Expected: Vercel API routes can query campaign data without exposing credentials to the browser.

## Task 5: Configure Plivo Routing

**Files:**
- No source files.

- [ ] **Step 1: Set Plivo answer URL**

Use:

```text
https://<vercel-app-domain>/api/plivo/answer
```

- [ ] **Step 2: Set Plivo status and recording URLs**

Use:

```text
https://<vercel-app-domain>/api/plivo/hangup
https://<vercel-app-domain>/api/plivo/recording
```

- [ ] **Step 3: Verify generated answer XML**

Call the answer route with a test call ID:

```powershell
Invoke-WebRequest -UseBasicParsing "https://<vercel-app-domain>/api/plivo/answer?callId=00000000-0000-0000-0000-000000000000"
```

Expected: response is XML and contains `wss://<railway-service-domain>/plivo/audio-stream`.

## Task 6: Production Smoke Test

**Files:**
- No source files.

- [ ] **Step 1: Run simulated campaign**

Use the deployed portal to upload or seed 10 contacts, start a simulated campaign, process callbacks, and export CSV.

Expected:
- Dashboard totals update.
- Call detail shows transcript, summary, disposition, next action, and language.
- CSV export includes original uploaded details plus result columns.

- [ ] **Step 2: Run one live Plivo call**

Start one test call through the deployed Vercel API.

Expected:
- Plivo requests the Vercel answer URL.
- Railway logs one Plivo stream connection.
- OpenAI Realtime session starts with Hindi-first instructions.
- Voice bridge posts final outcome to Vercel.
- Portal shows updated call status and outcome.

- [ ] **Step 3: Promote release**

Promote the Vercel deployment to production and keep the Railway service pinned to the same commit.

Expected: production demo URL and voice bridge URL are both stable.

## Plan Self-Review

Spec coverage:
- Hosting choice is explicit: Vercel for web/API/cron, Railway for bridge, Supabase for data.
- Distribution path includes preview, production, and public endpoint routing.
- Shipping path includes environment variables, Plivo routing, and smoke tests.

Placeholder scan:
- Placeholder tokens are limited to deployment values that must be supplied by the operator, such as `<vercel-app-domain>` and `<railway-service-domain>`.
- No implementation step is left as an undefined task.

Type consistency:
- `APP_BASE_URL`, `VOICE_BRIDGE_PUBLIC_WS_URL`, and `VOICE_OUTCOME_SECRET` are named consistently with `.env.example` and the realtime voice plan.

## Execution Handoff
Plan complete and saved to `docs/superpowers/plans/2026-05-27-hosting-distribution-shipping.md`.

Two execution options:

1. **Subagent-Driven (recommended)** - dispatch a fresh subagent per task and review between tasks.
2. **Inline Execution** - execute tasks in this session using executing-plans, with checkpoints for review.
