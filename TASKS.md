# Tasks

## Progress Summaries
- [2026-05-26 progress summary](docs/daily-summary-2026-05-26.md)

## Phase 1: Project Setup
- [x] Create Codex-optimized repository scaffold.
- [x] Add project instructions in `AGENTS.md`.
- [x] Add starter product, documentation, and verification files.
- [x] Import outbound AI calling agent PRD into project docs.
- [x] Create implementation plan and phased task list.
- [x] Create focused MVP product and execution plan in `PLAN.md`.
- [x] Create Superpowers realtime Plivo voice agent spec and implementation plan.
- [x] Clarify Excel/CSV upload, enriched CSV export, portal result display, and parallel calling requirements. Spec: [bulk upload design](docs/superpowers/specs/2026-05-27-bulk-upload-parallel-calling-design.md). Plan: [bulk upload implementation plan](docs/superpowers/plans/2026-05-27-bulk-upload-parallel-calling.md).
- [x] Set Hindi (`hi`) as the primary/default calling language, with English secondary and other Indian language packs configured.
- [x] Run model council review across plan, design, UI/UX, architecture, and task tracking. Score: [88/100](docs/model-council-review-2026-05-27.md).
- [ ] Initialize git repository if desired.
- [ ] Scaffold Next.js App Router TypeScript project.
- [ ] Add Tailwind CSS.
- [ ] Add test framework and baseline test command.
- [ ] Confirm `scripts/setup.sh` and `scripts/verify.sh` run in the target shell.
- [ ] Confirm default implementation assumptions: Supabase, Plivo-first adapter, simulated callback fallback, simple admin auth, Vitest or equivalent test stack.

## Phase 2: Core Architecture
- [ ] Create config layer for environment variables.
- [ ] Add simple admin auth gate for dashboard and write APIs.
- [ ] Add provider webhook shared-secret or signature validation helper.
- [ ] Add cron authorization helper using `CRON_SECRET`.
- [ ] Define internal enums for campaign status, call status, disposition, and next action.
- [ ] Define call state machine, terminal states, and retry eligibility rules.
- [ ] Create provider adapter interface.
- [ ] Add Plivo adapter skeleton.
- [ ] Add Twilio adapter skeleton.
- [ ] Add Exotel adapter skeleton.
- [ ] Add audit event writing contract.
- [ ] Document architecture updates in `docs/architecture.md`.

## Phase 3: Data Model
- [ ] Choose Supabase or managed PostgreSQL.
- [ ] Add SQL migration for `campaigns`.
- [ ] Add SQL migration for `contacts`.
- [ ] Add SQL migration for `calls`.
- [ ] Add SQL migration for `call_events`.
- [ ] Add SQL migration for `language_assets`.
- [ ] Add SQL migration for `exports`.
- [ ] Add seed language assets.
- [ ] Add sample Excel template.
- [ ] Add sample CSV template.
- [ ] Add data access tests for core queries.

## Phase 4: Contact Ingestion
- [ ] Build spreadsheet upload UI for Excel and CSV.
- [ ] Accept `.xlsx` and `.csv` uploads.
- [ ] Parse Excel files server-side.
- [ ] Parse CSV files server-side.
- [ ] Validate required columns.
- [ ] Preserve original uploaded row details, including extra business columns.
- [ ] Normalize phone numbers.
- [ ] Validate machine count as a positive integer.
- [ ] Deduplicate by campaign, phone, and order ID.
- [ ] Show import summary with invalid rows and duplicates.
- [ ] Show preserved source columns in the import summary.
- [ ] Add unit and integration tests for upload parsing.

### Acceptance Criteria
- [ ] `POST /api/upload` rejects unsupported file types and missing required columns.
- [ ] `POST /api/upload` reports invalid rows and skipped duplicates.
- [ ] `POST /api/upload` preserves original uploaded columns for portal display and export.
- [ ] Imported contacts are visible in a draft campaign.

## Phase 5: Campaign Management
- [ ] Build campaign creation API.
- [ ] Build campaign dashboard page.
- [ ] Add campaign stats query.
- [ ] Add campaign start API.
- [ ] Add campaign-level `concurrency_limit` with MVP default of 5.
- [ ] Enqueue initial call rows for campaign contacts.
- [ ] Dispatch outbound calls in bounded parallel batches.
- [ ] Refill available call slots as active calls complete.
- [ ] Add loading, empty, and error states.
- [ ] Add tests for campaign creation and start behavior.

### Acceptance Criteria
- [ ] `POST /api/campaigns/:id/start` requires admin protection.
- [ ] Starting a draft campaign queues one initial call per valid contact.
- [ ] Starting a campaign dispatches multiple simultaneous calls up to `concurrency_limit`.
- [ ] Starting an already-running campaign does not duplicate calls.

## Phase 6: Calling Provider Integration
- [ ] Implement Plivo `createCall`.
- [ ] Implement Plivo answer response builder.
- [ ] Implement Plivo hangup webhook parser.
- [ ] Implement Plivo recording webhook parser.
- [ ] Persist provider call IDs.
- [ ] Map provider statuses into internal statuses.
- [ ] Save raw provider payloads in `call_events`.
- [ ] Add idempotency tests for duplicate webhook events.
- [ ] Add simulated callback route or test helper for demo mode.

### Acceptance Criteria
- [ ] Provider webhooks validate signature or shared secret before state changes.
- [ ] Duplicate provider callbacks append at most one effective state transition.
- [ ] Terminal call states cannot move back to non-terminal states.

## Phase 7: Conversation and AI Classification
- [ ] Create Hindi primary script pack.
- [ ] Create English secondary script pack.
- [ ] Add scripted language pack configuration for additional Indian languages.
- [ ] Add language fallback rules: missing or unsupported `language_hint` falls back to Hindi.
- [ ] Add deterministic yes/no/unclear classifier fallback.
- [ ] Add AI helper for language detection.
- [ ] Add AI helper for transcript summarization.
- [ ] Add AI helper for disposition extraction.
- [ ] Persist `confidence` internally or in metadata.
- [ ] Route low-confidence calls to `manual_review`.
- [ ] Add tests for disposition mapping and next-action rules.

### Acceptance Criteria
- [ ] Simulated callbacks can include transcript text for classification.
- [ ] Live provider path stores recording URL and transcript source metadata.
- [ ] Low-confidence AI output becomes `manual_review`.

## Phase 8: Retry and Reconciliation
- [ ] Add retry policy model.
- [ ] Implement `POST /api/calls/:id/retry`.
- [ ] Implement `GET /api/cron/retry-unanswered`.
- [ ] Implement `GET /api/cron/reconcile-provider-status`.
- [ ] Protect cron routes with `CRON_SECRET`.
- [ ] Add tests for retry limits and terminal states.

### Acceptance Criteria
- [ ] `GET /api/cron/retry-unanswered` requires `CRON_SECRET`.
- [ ] Retry does not exceed campaign retry limit.
- [ ] Completed, confirmed, declined, invalid, and manual-review calls are not retried automatically.

## Phase 9: Dashboard and Export
- [ ] Build campaign list view.
- [ ] Build campaign detail dashboard.
- [ ] Build call result detail page.
- [ ] Show original uploaded row details in the campaign results table.
- [ ] Add filters by status, disposition, and language.
- [ ] Add recording and transcript display.
- [ ] Add CSV export for all result rows, engineer-ready rows, and follow-up rows.
- [ ] Ensure CSV export includes original uploaded columns plus call status, disposition, recording URL, transcript status, summary, next action, attempt number, last call time, and retry eligibility.
- [ ] Add mobile responsive checks.
- [ ] Add e2e test for upload-to-export demo workflow.

### Acceptance Criteria
- [ ] Dashboard shows the hackathon golden path states from seeded or uploaded contacts.
- [ ] Dashboard shows uploaded name, phone, location, and business details beside call outcomes.
- [ ] Call detail shows transcript, summary, disposition, next action, and recording URL.
- [ ] Export includes confirmed pickup and follow-up rows with original uploaded details and appended result columns.

## Phase 10: Security and Reliability
- [ ] Re-check provider webhook signatures or shared secrets where supported.
- [ ] Add clear error responses without leaking secrets.
- [ ] Ensure `.env` is never read directly outside config.
- [ ] Re-check rate limits or basic admin protection for write routes.
- [ ] Add audit events for meaningful state changes.
- [ ] Add tests for invalid inputs and duplicate callbacks.
- [ ] Add recording and transcript access policy.
- [ ] Add retention or deletion decision for sensitive call evidence.

## Hackathon Golden Path Milestone
- [ ] Add sample Excel file with 10 contacts.
- [ ] Add sample CSV file with 10 contacts.
- [ ] Upload sample file and create campaign.
- [ ] Start campaign and queue calls.
- [ ] Confirm multiple calls can be active simultaneously within the configured limit.
- [ ] Simulate callbacks for at least 8 calls.
- [ ] Classify at least 3 confirmed pickups, 2 follow-up needed, 1 invalid number, and 1 not picked.
- [ ] Show dashboard status totals.
- [ ] Open one completed call detail.
- [ ] Export engineer-ready CSV.
- [ ] Confirm exported CSV preserves uploaded details and includes status, recording link, summary, disposition, next action, and retry fields.

## Phase 11: Documentation
- [x] Create `design.md` UI and UX design specification.
- [x] Apply UI-UX-Pro-Max quality pass to `design.md`.
- [x] Create [2026-05-26 progress summary](docs/daily-summary-2026-05-26.md).
- [x] Create `Memory.md` crash-resume checkpoint for 2026-05-27.
- [ ] Update `README.md` with final setup commands.
- [ ] Update `README.md` with provider setup steps.
- [ ] Update `docs/api.md` as route contracts change.
- [ ] Record provider and stack decisions in `docs/decisions.md`.
- [ ] Update `CHANGELOG.md` after each meaningful milestone.

## Phase 12: Deployment Readiness
- [ ] Add Vercel configuration for cron jobs.
- [ ] Configure Supabase or database connection.
- [ ] Configure provider webhook URLs.
- [ ] Add deployment smoke test checklist.
- [ ] Run `./scripts/verify.sh`.
- [ ] Perform demo rehearsal with seeded or live contacts.

## First Implementation Slice
- [ ] Scaffold Next.js App Router TypeScript project with Tailwind and tests. Spec: [MVP scope](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md#mvp-scope-for-tomorrow). Plan: [Task 1 - Scaffold Next.js and Verification](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-1-scaffold-nextjs-and-verification). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).
- [ ] Add config layer with `.env.example` alignment. Spec: [voice selection](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md#voice-selection). Plan: [Task 2 - Add Environment Validation](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-2-add-environment-validation). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).
- [ ] Add minimal admin auth, webhook auth, and cron auth helpers. Spec: [API authentication](docs/api.md#authentication). Plan: [Task 1 - Scaffold Next.js and Verification](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-1-scaffold-nextjs-and-verification). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).
- [ ] Add enums and pure domain helpers for statuses, dispositions, and next actions. Spec: [shared enums](docs/api.md#shared-enums). Plan: [Task 3 - Add Domain Types and Agent Instructions](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-3-add-domain-types-and-agent-instructions). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).
- [ ] Build Plivo outbound call start API. Spec: [architecture](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md#architecture). Plan: [Task 5 - Build Plivo Call Start and Answer XML](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-5-build-plivo-call-start-and-answer-xml). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).
- [ ] Build Plivo answer URL that returns bidirectional AudioStream XML. Spec: [audio format](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md#audio-format). Plan: [Task 5 - Build Plivo Call Start and Answer XML](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-5-build-plivo-call-start-and-answer-xml). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).
- [ ] Build Node WebSocket voice bridge for Plivo AudioStream. Spec: [service boundary](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md#service-boundary). Plan: [Task 6 - Build Voice Bridge Plivo Side](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-6-build-voice-bridge-plivo-side). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).
- [ ] Connect voice bridge to OpenAI Realtime with configurable voice. Spec: [voice selection](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md#voice-selection). Plan: [Task 7 - Connect Voice Bridge to OpenAI Realtime](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-7-connect-voice-bridge-to-openai-realtime). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).
- [ ] Add Hindi-first realtime agent prompt rules: start in Hindi, switch to English only when configured or requested, and use configured regional packs when available.
- [ ] Save realtime call transcript and outcome to database. Spec: [database outcome](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md#database-outcome). Plan: [Task 8 - Save Final Voice Outcome](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-8-save-final-voice-outcome). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).
- [ ] Show realtime call outcome in MVP dashboard. Spec: [acceptance criteria](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md#acceptance-criteria). Plan: [Task 9 - Add MVP Dashboard](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-9-add-mvp-dashboard). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).
- [ ] Add unit tests for status and disposition mapping. Spec: [testing strategy](docs/architecture.md#testing-strategy). Plan: [Task 3 - Add Domain Types and Agent Instructions](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-3-add-domain-types-and-agent-instructions). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).
- [ ] Run verify script and update this checklist.

### First Implementation Slice Acceptance Criteria
Source: [approved spec acceptance criteria](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md#acceptance-criteria) and [manual end-to-end plan](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-10-manual-end-to-end-test).

- [ ] A call can be started from `POST /api/calls/start` or a dashboard action using an existing call row.
- [ ] Plivo fetches the app answer URL after the outbound call is answered.
- [ ] The answer URL returns bidirectional Plivo AudioStream XML, not Speak-only XML.
- [ ] The voice bridge receives Plivo `start` and `media` events for the call.
- [ ] The voice bridge opens one OpenAI Realtime session per Plivo stream.
- [ ] The OpenAI Realtime session uses `OPENAI_REALTIME_MODEL` and `OPENAI_REALTIME_VOICE`.
- [ ] The OpenAI Realtime session uses Hindi as the default call language unless a supported override is present.
- [ ] OpenAI audio deltas are sent back to Plivo with `playAudio` so the customer hears the AI voice.
- [ ] Transcript text or a conservative conversation summary is saved for the call.
- [ ] The saved call row has a disposition and next action after the call closes.
- [ ] The MVP dashboard shows the realtime call status, disposition, next action, and summary.
- [ ] A simulated callback fallback remains available for demo resilience.
