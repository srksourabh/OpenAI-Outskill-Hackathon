# Tasks

## Phase 1: Project Setup
- [x] Create Codex-optimized repository scaffold.
- [x] Add project instructions in `AGENTS.md`.
- [x] Add starter product, documentation, and verification files.
- [x] Import outbound AI calling agent PRD into project docs.
- [x] Create implementation plan and phased task list.
- [x] Create focused MVP product and execution plan in `PLAN.md`.
- [x] Create Superpowers realtime Plivo voice agent spec and implementation plan.
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
- [ ] Add data access tests for core queries.

## Phase 4: Contact Ingestion
- [ ] Build Excel upload UI.
- [ ] Parse Excel files server-side.
- [ ] Validate required columns.
- [ ] Normalize phone numbers.
- [ ] Validate machine count as a positive integer.
- [ ] Deduplicate by campaign, phone, and order ID.
- [ ] Show import summary with invalid rows and duplicates.
- [ ] Add unit and integration tests for upload parsing.

### Acceptance Criteria
- [ ] `POST /api/upload` rejects missing required columns.
- [ ] `POST /api/upload` reports invalid rows and skipped duplicates.
- [ ] Imported contacts are visible in a draft campaign.

## Phase 5: Campaign Management
- [ ] Build campaign creation API.
- [ ] Build campaign dashboard page.
- [ ] Add campaign stats query.
- [ ] Add campaign start API.
- [ ] Enqueue initial call rows for campaign contacts.
- [ ] Add loading, empty, and error states.
- [ ] Add tests for campaign creation and start behavior.

### Acceptance Criteria
- [ ] `POST /api/campaigns/:id/start` requires admin protection.
- [ ] Starting a draft campaign queues one initial call per valid contact.
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
- [ ] Create English script pack.
- [ ] Create Hindi script pack.
- [ ] Add scripted language pack configuration for additional Indian languages.
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
- [ ] Add filters by status, disposition, and language.
- [ ] Add recording and transcript display.
- [ ] Add CSV export for engineer-ready and follow-up rows.
- [ ] Add mobile responsive checks.
- [ ] Add e2e test for upload-to-export demo workflow.

### Acceptance Criteria
- [ ] Dashboard shows the hackathon golden path states from seeded or uploaded contacts.
- [ ] Call detail shows transcript, summary, disposition, next action, and recording URL.
- [ ] Export includes confirmed pickup and follow-up rows.

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
- [ ] Upload sample file and create campaign.
- [ ] Start campaign and queue calls.
- [ ] Simulate callbacks for at least 8 calls.
- [ ] Classify at least 3 confirmed pickups, 2 follow-up needed, 1 invalid number, and 1 not picked.
- [ ] Show dashboard status totals.
- [ ] Open one completed call detail.
- [ ] Export engineer-ready CSV.

## Phase 11: Documentation
- [x] Create `design.md` UI and UX design specification.
- [x] Apply UI-UX-Pro-Max quality pass to `design.md`.
- [x] Create [daily progress summary for 2026-05-26](docs/daily-summary-2026-05-26.md).
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
- [ ] Scaffold Next.js App Router TypeScript project with Tailwind and tests.
- [ ] Add config layer with `.env.example` alignment.
- [ ] Add minimal admin auth, webhook auth, and cron auth helpers.
- [ ] Add enums and pure domain helpers for statuses, dispositions, and next actions.
- [ ] Build Plivo outbound call start API. Spec: [Realtime Plivo Voice Agent Design](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md). Plan: [Task 5 - Build Plivo Call Start and Answer XML](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-5-build-plivo-call-start-and-answer-xml).
- [ ] Build Plivo answer URL that returns bidirectional AudioStream XML. Spec: [Realtime Plivo Voice Agent Design](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md). Plan: [Task 5 - Build Plivo Call Start and Answer XML](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-5-build-plivo-call-start-and-answer-xml).
- [ ] Build Node WebSocket voice bridge for Plivo AudioStream. Spec: [Realtime Plivo Voice Agent Design](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md). Plan: [Task 6 - Build Voice Bridge Plivo Side](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-6-build-voice-bridge-plivo-side).
- [ ] Connect voice bridge to OpenAI Realtime with configurable voice. Spec: [Realtime Plivo Voice Agent Design](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md). Plan: [Task 7 - Connect Voice Bridge to OpenAI Realtime](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-7-connect-voice-bridge-to-openai-realtime).
- [ ] Save realtime call transcript and outcome to database. Spec: [Realtime Plivo Voice Agent Design](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md). Plan: [Task 8 - Save Final Voice Outcome](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-8-save-final-voice-outcome).
- [ ] Show realtime call outcome in MVP dashboard. Spec: [Realtime Plivo Voice Agent Design](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md). Plan: [Task 9 - Build Minimal Dashboard](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-9-build-minimal-dashboard).
- [ ] Add unit tests for status and disposition mapping.
- [ ] Run verify script and update this checklist.

### First Implementation Slice Acceptance Criteria
- [ ] A test call can be started from an API or dashboard action.
- [ ] Plivo fetches the app answer URL for the outbound call.
- [ ] The answer URL returns bidirectional Stream XML, not Speak-only XML.
- [ ] The voice bridge receives Plivo `start` and `media` events.
- [ ] The OpenAI Realtime session sends at least one audio response with the configured voice.
- [ ] The customer hears the AI voice through the phone call.
- [ ] Transcript fragments or a conversation summary are saved.
- [ ] The call row has a disposition and next action after the call.
- [ ] The dashboard shows the realtime call result.
- [ ] Simulated callback fallback remains available for demo reliability.
