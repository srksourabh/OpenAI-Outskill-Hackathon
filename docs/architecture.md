# Architecture

## System Overview
The MVP is a webhook-driven outbound calling system. The app should stay thin and reliable: it creates campaigns, stores call state, delegates telephony to provider APIs, receives provider callbacks, and uses AI helpers only to summarize and classify call evidence.

```text
Next.js on Vercel
+-- UI
|   +-- Upload page
|   +-- Campaign dashboard
|   +-- Call result detail
|   \-- Export view
+-- API route handlers
|   +-- Upload and campaign APIs
|   +-- Provider webhook APIs
|   \-- Cron retry/reconcile APIs
+-- Services
|   +-- Contact ingestion
|   +-- Campaign orchestration
|   +-- Parallel call dispatch
|   +-- Telephony adapters
|   +-- AI classification
|   \-- Export generation
\-- Data layer
    +-- PostgreSQL or Supabase
    +-- Call event audit log
    \-- Optional object storage for files

Node voice bridge on Railway or equivalent always-on container host
+-- Plivo AudioStream WebSocket endpoint
+-- OpenAI Realtime WebSocket client
+-- Audio packet relay
\-- Final outcome poster back to Vercel API
```

## Hosting Topology
- **Vercel:** Next.js app, admin portal, upload/campaign/export APIs, Plivo answer/status/recording webhooks, cron retry and reconciliation.
- **Railway:** long-running Node WebSocket voice bridge for Plivo AudioStream and OpenAI Realtime sessions.
- **Supabase:** Postgres database and optional object storage.
- **Plivo:** outbound telephony. Plivo calls the Vercel answer URL, receives XML that points audio streaming to Railway, and sends status/recording callbacks back to Vercel.

Vercel is not the primary host for the realtime audio bridge because serverless functions are not designed for long-lived bidirectional WebSocket audio sessions. The bridge must run as an always-on Node process.

## Folder Structure
```text
.
+-- docs/
|   +-- api.md
|   +-- architecture.md
|   +-- decisions.md
|   \-- implementation-plan.md
+-- scripts/
|   +-- setup.sh
|   \-- verify.sh
+-- src/
|   +-- app/
|   +-- config/
|   +-- domain/
|   +-- lib/
|   +-- services/
|   \-- providers/
+-- tests/
|   +-- e2e/
|   +-- integration/
|   \-- unit/
+-- AGENTS.md
+-- PRD.md
+-- README.md
\-- TASKS.md
```

## Data Flow
1. Admin uploads Excel or CSV file.
2. Upload route validates rows, preserves original row details, and creates campaign contacts.
3. Admin starts campaign.
4. Campaign service creates queued call records.
5. Parallel dispatch service initiates outbound calls up to the campaign concurrency limit.
6. Provider callbacks update call state and append `call_events`.
7. Recording and transcript evidence is attached to the call.
8. Classification service sets disposition, next action, reason code, language, and summary.
9. Dashboard queries campaign stats, original uploaded fields, and call results.
10. Export service generates operations-ready CSV with original uploaded columns plus result columns.

## MVP Defaults
- Database: Supabase Postgres.
- Web app host: Vercel.
- Realtime voice bridge host: Railway or equivalent always-on container host.
- First provider: Plivo adapter.
- Demo fallback: simulated provider callbacks.
- Primary calling language: Hindi (`hi`).
- Secondary calling language: English (`en`).
- Missing or unsupported `language_hint` values fall back to Hindi.
- Admin protection: simple admin-only gate before write APIs are exposed.
- Test stack: Vitest for unit and integration tests unless the selected scaffold suggests a better local default.
- AI/STT path: simulated transcripts first, provider recording/transcription integration second, OpenAI summarization and disposition extraction behind service functions.

## Key Modules
- `src/config/`: Validates and exposes environment variables. No direct `process.env` access outside this layer.
- `src/domain/`: Pure enums, status mapping, disposition rules, validation schemas, and language pack definitions.
- `src/providers/`: Provider adapter interface and provider-specific implementations.
- `src/services/ingestion/`: Excel and CSV parsing, row normalization, original row preservation, and deduplication.
- `src/services/campaigns/`: Campaign creation, start, stats, and result queries.
- `src/services/calls/`: Call orchestration, bounded parallel dispatch, retry rules, and status transitions.
- `src/services/ai/`: Language detection, transcript summarization, and disposition extraction.
- `src/app/api/`: Next.js route handlers for upload, campaigns, webhooks, and cron.
- `src/app/`: UI routes for upload, dashboard, call detail, and exports.

## Telephony Adapter Interface
```ts
export interface TelephonyAdapter {
  createCall(input: CreateCallInput): Promise<CreateCallResult>
  getCall(callId: string): Promise<ProviderCall>
  stopCall(callId: string): Promise<void>
  parseStatusWebhook(payload: unknown): ProviderStatusEvent
  parseRecordingWebhook(payload: unknown): ProviderRecordingEvent
  buildVoiceResponse(input: VoiceResponseInput): string
}
```

## Data Model
Core tables:
- `campaigns`: Campaign configuration and lifecycle state.
- `contacts`: Imported recipient rows.
- `calls`: One call attempt per contact and retry attempt.
- `call_events`: Append-only provider and system audit events.
- `language_assets`: Script text for supported languages.
- `exports`: Generated export files.

Important constraints:
- Unique contact per `(campaign_id, phone, order_id)`.
- Unique provider call per `(provider, provider_call_id)` when provider ID is present.
- Index calls by campaign and status for dashboard performance.
- Store original uploaded row data on each contact so extra business columns survive portal display and CSV export.
- Store raw provider payloads for audit and reconciliation.

Suggested `contacts` fields:
- Canonical columns: `provider_name`, `phone`, `location`, `machine_count`, `order_id`, `language_hint`, `alternate_phone`, `address`.
- Preserved upload payload: `source_row_data jsonb`.
- Source metadata: `source_file_name`, `source_file_type`, `source_row_number`.

Suggested `campaigns` field for parallel dispatch:
- `concurrency_limit integer not null default 5`.

## Call State Machine

Allowed forward transitions:

| From | Allowed To |
|---|---|
| `queued` | `initiated`, `failed`, `invalid_number` |
| `initiated` | `ringing`, `answered`, `failed`, `not_connected`, `invalid_number` |
| `ringing` | `answered`, `not_picked`, `not_connected`, `failed` |
| `answered` | `completed`, `voicemail`, `failed` |
| `completed` | terminal disposition update only |
| `failed` | terminal, retry may create a new call attempt |
| `not_picked` | terminal, retry may create a new call attempt |
| `not_connected` | terminal, retry may create a new call attempt |
| `invalid_number` | terminal |
| `voicemail` | terminal |

Retry-eligible statuses:
- `failed`
- `not_picked`
- `not_connected`

Non-retry statuses:
- `completed`
- `invalid_number`
- `voicemail`
- Any call with disposition `confirmed_pickup`, `declined`, or `manual_review`.

Duplicate webhook handling:
- Derive an idempotency key from provider, provider call ID, event type, and provider event timestamp or recording ID when available.
- Store every raw event only once per idempotency key.
- Apply state transitions inside a database transaction.
- Ignore stale transitions that would move a terminal call back to a non-terminal state.

## Parallel Call Dispatch
Campaign execution must not call contacts one by one. The dispatcher should:
- Select queued calls for a running campaign up to `concurrency_limit - active_call_count`.
- Mark selected rows as `initiated` only after the provider accepts the call request.
- Keep queued rows untouched when provider creation fails, unless the error proves an invalid number or permanent provider rejection.
- Refill available slots as active calls move to terminal states.
- Respect provider-level rate limits through a conservative per-campaign default of 5 active calls.
- Keep the first demo configurable so the team can lower concurrency to 1 for debugging and raise it for normal campaign runs.

## Dependency Rules
- Add dependencies only when required for the chosen stack or core MVP behavior.
- Keep provider-specific SDK code behind adapters.
- Keep domain logic independent of Next.js route handlers.
- Use deterministic rules before AI where possible.
- Do not store secrets in source files or client-visible bundles.

## Testing Strategy
- Unit tests: enums, status mapping, contact validation, disposition rules, language pack selection.
- Integration tests: Excel and CSV upload parsing, campaign creation, parallel call dispatch limits, idempotent webhook ingestion, retry scheduler.
- E2E tests: upload sample sheet, start campaign, simulate callbacks, inspect dashboard, export results.
- Verification: `scripts/verify.sh` runs lint, tests, and build when those commands exist.

## Reliability Rules
- Webhook handlers must be idempotent.
- Duplicate callbacks must not create duplicate terminal state transitions.
- Unknown provider statuses should map to `manual_review` or `failed` with audit evidence.
- Cron routes must require `CRON_SECRET`.
- Low-confidence AI outputs must fall back to `manual_review`.

## Voice and Transcript Path
- Simulated demo mode accepts transcript text in simulated callback payloads and runs classification immediately.
- Live Plivo mode stores provider call ID and recording URL first.
- Transcript text can come from provider transcription, manual demo fixture, or a later STT service.
- The classification service must record transcript source metadata so demo data and live data are distinguishable.

## Privacy and Data Access
- Recordings and transcripts are sensitive operational data.
- Only admin users should access recordings, transcripts, exports, and raw provider payloads.
- Exports must preserve uploaded business details and append result columns, but must exclude raw provider payloads, secrets, and internal audit metadata.
- Retention is not implemented in the hackathon MVP, but the decision must be recorded before production use.
