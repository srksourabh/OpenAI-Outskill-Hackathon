# Implementation Plan

## Goal
Build a demo-ready outbound AI calling agent that can import Excel contacts, start a provider-backed calling campaign, process provider callbacks, classify outcomes, and export operations-ready results.

## Product Assumptions
- Primary geography is India.
- Default database is Supabase Postgres.
- First live provider is Plivo.
- Simulated callback mode is required for the hackathon demo.
- English and Hindi receive the most complete demo support.
- Other Indian languages are represented through visible script packs and classification configuration in the MVP.
- Simple admin-only access is required for the hackathon.
- Provider callbacks may be simulated for demo resilience if live telephony setup is blocked.

## Hackathon Demo Golden Path
The default demo should be deterministic:

1. Upload or seed 10 contacts.
2. Start one campaign.
3. Queue one call per contact.
4. Process at least 8 simulated or live callbacks.
5. Classify at least 3 confirmed pickups, 2 follow-up needed, 1 invalid number, and 1 not picked.
6. Open a completed call detail showing transcript, summary, detected language, disposition, next action, and recording URL.
7. Export engineer-ready CSV rows.

Live Plivo calling is a bonus proof point. The simulated callback path is the required fallback that keeps the demo above the reliability bar.

## Build Sequence

### Slice 1: Stack and Domain Foundation
Deliverables:
- Next.js App Router TypeScript scaffold.
- Tailwind CSS.
- Test runner.
- Config layer.
- Simple admin auth, webhook auth, and cron auth helpers.
- Shared enums and pure domain helpers.
- Unit tests for status and disposition mapping.

Definition of done:
- `scripts/setup.sh` installs dependencies.
- `scripts/verify.sh` runs lint, tests, and build.
- No route or service reads secrets outside config.
- Write APIs and cron routes have auth helpers before feature routes are built.

### Slice 2: Data and Ingestion
Deliverables:
- Database migrations for core tables.
- Excel parser.
- Upload API.
- Contact validation and deduplication.
- Import summary UI.
- Sample Excel template.

Definition of done:
- Invalid rows are reported.
- Duplicate contacts are skipped deterministically.
- Unit and integration tests cover required columns and row validation.

### Slice 3: Campaign Dashboard
Deliverables:
- Campaign creation API.
- Campaign start API.
- Campaign list and detail dashboard.
- Campaign stats query.
- Empty, loading, and error states.

Definition of done:
- A campaign can move from draft to running.
- Queued calls are visible in the dashboard.
- Dashboard works on desktop and mobile widths.

### Slice 4: Provider Integration
Deliverables:
- Telephony adapter interface.
- Plivo adapter implementation.
- Twilio and Exotel adapter scaffolds.
- Provider status mapping.
- Plivo answer, hangup, and recording webhook routes.
- Simulated callback route for demo mode.
- Call event audit logging.

Definition of done:
- Duplicate webhooks are idempotent.
- Provider call IDs are stored and reconciled.
- Raw payloads are stored for audit.
- Provider webhooks validate signature or shared secret before state changes.

### Slice 5: Conversation and Classification
Deliverables:
- English and Hindi scripts.
- Script pack records for additional Indian languages.
- Deterministic yes/no/unclear fallback classifier.
- AI helper contracts for language detection, summary, and disposition.
- Low-confidence manual review behavior.
- Transcript source metadata for simulated, provider transcription, manual fixture, or future STT.

Definition of done:
- Confirmed pickup maps to `send_engineer`.
- Declined and unclear outcomes capture reason and next action.
- Classification tests cover positive, negative, unclear, and low-confidence cases.

## Endpoint Test Gates
- `POST /api/upload`: rejects missing columns, reports invalid rows, skips duplicates, creates draft campaign contacts.
- `POST /api/campaigns/:id/start`: requires admin auth, queues calls once, avoids duplicate queueing.
- Provider webhooks: require auth, store raw events, apply idempotent state transitions, ignore stale terminal transitions.
- `POST /api/webhooks/simulated/call-event`: classifies supplied transcript and marks transcript source as `simulated`.
- `GET /api/cron/retry-unanswered`: requires `CRON_SECRET` and respects retry limit.
- Export route: returns only allowed operational fields and excludes raw payloads.

### Slice 6: Retry, Export, and Demo Polish
Deliverables:
- Manual retry API.
- Cron retry route.
- Provider reconciliation route.
- CSV export.
- Call detail page with transcript, recording URL, summary, and next action.
- Demo seed data and callback simulation path.

Definition of done:
- Retry limit is enforced.
- Export includes engineer-ready and follow-up rows.
- Demo can run with either live provider callbacks or simulated callbacks.

## Suggested Implementation Order
1. Scaffold Next.js and test tooling.
2. Add config, enums, validation, and status mapping.
3. Add database migrations and data access functions.
4. Build upload parser and import flow.
5. Build campaign dashboard and start flow.
6. Implement provider adapter interface and Plivo path.
7. Add webhooks and audit events.
8. Add classification helpers and language packs.
9. Add retry/reconcile cron routes.
10. Add export and final demo polish.

## Council Scorecard Target
The implementation plan should score at least 80 out of 100 across:

| Dimension | Weight | Target |
|---|---:|---|
| Product clarity | 20 | Clear user, workflow, and demo outcome. |
| Technical feasibility | 20 | Buildable during hackathon with fallback paths. |
| Architecture quality | 20 | Simple, modular, provider-agnostic boundaries. |
| Reliability and security | 20 | Idempotent webhooks, validation, no secrets leakage. |
| Execution readiness | 20 | Phased tasks, definitions of done, test gates. |

## Open Decisions Before Coding
- Confirm whether live Plivo calls are available, or whether the first demo is simulated-only.
- Confirm recording consent wording.
- Confirm exact admin authentication mechanism.
- Confirm retention/deletion policy for recordings and transcripts before production use.
