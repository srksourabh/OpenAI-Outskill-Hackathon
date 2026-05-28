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
- [x] Create Superpowers realtime Plivo voice agent spec and implementation plan. Spec: [realtime Plivo voice agent design](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md). Plan: [realtime Plivo voice agent implementation plan](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).
- [x] Clarify Excel/CSV upload, enriched CSV export, portal result display, and parallel calling requirements. Spec: [bulk upload design](docs/superpowers/specs/2026-05-27-bulk-upload-parallel-calling-design.md). Plan: [bulk upload implementation plan](docs/superpowers/plans/2026-05-27-bulk-upload-parallel-calling.md).
- [x] Create OpenAI Realtime multilingual voice agent design spec with English-first language policy, Hindi fallback, explicit-request language switching, and UI-configurable agent settings. Spec: [OpenAI Realtime multilingual voice agent design](docs/superpowers/specs/2026-05-27-openai-realtime-multilingual-voice-agent-design.md). Plan: [OpenAI Realtime multilingual voice agent implementation plan](docs/superpowers/plans/2026-05-27-openai-realtime-multilingual-voice-agent.md). Acceptance: [multilingual realtime criteria](docs/superpowers/specs/2026-05-27-openai-realtime-multilingual-voice-agent-design.md#acceptance-criteria).
- [x] Create dashboard-controlled agent settings and call history design. Spec: [dashboard agent settings and call history design](docs/superpowers/specs/2026-05-28-dashboard-agent-settings-history-design.md). Plan: [dashboard agent settings and call history implementation plan](docs/superpowers/plans/2026-05-28-dashboard-agent-settings-history.md). Acceptance: [agent settings and history criteria](docs/superpowers/specs/2026-05-28-dashboard-agent-settings-history-design.md#acceptance-criteria).
- [x] Set Hindi (`hi`) as the primary/default calling language, with English secondary and other Indian language packs configured.
- [x] Run model council review across plan, design, UI/UX, architecture, and task tracking. Score: [88/100](docs/model-council-review-2026-05-27.md).
- [x] Decide hosting split and document shipping plan: Vercel for web/API/cron, Railway for realtime voice bridge, Supabase for data. Plan: [hosting distribution and shipping](docs/superpowers/plans/2026-05-27-hosting-distribution-shipping.md).
- [x] Initialize git repository if desired.
- [x] Scaffold Next.js App Router TypeScript project.
- [x] Add Tailwind CSS.
- [x] Add test framework and baseline test command.
- [x] Confirm Windows `scripts/setup.ps1` and `scripts/verify.ps1` run in the target shell.
- [x] Confirm default implementation assumptions: Supabase, Plivo-first adapter, simulated callback fallback, simple admin auth, Vitest or equivalent test stack.

## Phase 2: Core Architecture
- [x] Create config layer for environment variables.
- [x] Add simple admin auth gate for dashboard and write APIs.
- [x] Add provider webhook shared-secret or signature validation helper.
- [x] Add cron authorization helper using `CRON_SECRET`.
- [x] Define internal enums for campaign status, call status, disposition, and next action.
- [x] Define call state machine, terminal states, and retry eligibility rules.
- [x] Create provider adapter interface.
- [x] Add Plivo adapter skeleton. Spec: [telephony adapter interface](docs/architecture.md#telephony-adapter-interface) and [realtime Plivo architecture](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md#architecture). Acceptance: [provider integration criteria](#acceptance-criteria-2).
- [x] Add Twilio adapter skeleton.
- [x] Add Exotel adapter skeleton.
- [x] Add audit event writing contract.
- [x] Document architecture updates in `docs/architecture.md`.

## Phase 3: Data Model
- [x] Choose Supabase or managed PostgreSQL.
- [x] Add SQL migration for `campaigns`.
- [x] Add SQL migration for `contacts`.
- [x] Add SQL migration for `calls`.
- [x] Add SQL migration for `call_events`.
- [x] Add SQL migration for `language_assets`.
- [x] Add SQL migration for `exports`.
- [x] Add seed language assets.
- [x] Add sample Excel template.
- [x] Add sample CSV template.
- [x] Add data access tests for core queries.

## Phase 4: Contact Ingestion
- [x] Build spreadsheet upload UI for Excel and CSV.
- [x] Accept `.xlsx` and `.csv` uploads.
- [x] Parse Excel files server-side.
- [x] Parse CSV files server-side.
- [x] Support mobile-number-first uploads with common phone column aliases and sensible defaults.
- [x] Validate required columns.
- [x] Preserve original uploaded row details, including extra business columns.
- [x] Normalize phone numbers.
- [x] Validate machine count as a positive integer.
- [x] Deduplicate by campaign, phone, and order ID.
- [x] Show import summary with invalid rows and duplicates.
- [x] Show preserved source columns in the import summary.
- [x] Add downloadable sample CSV for quick mobile-number uploads.
- [x] Add unit and integration tests for upload parsing.

### Acceptance Criteria
- [x] `POST /api/upload` rejects unsupported file types and missing required columns.
- [x] `POST /api/upload` reports invalid rows and skipped duplicates.
- [x] `POST /api/upload` preserves original uploaded columns for portal display and export.
- [x] Imported contacts are visible in a draft campaign.

## Phase 5: Campaign Management
- [x] Build campaign creation API.
- [x] Build campaign dashboard page.
- [x] Add campaign stats query.
- [x] Add campaign start API.
- [x] Surface live start errors in the dashboard instead of generic action failures.
- [x] Add campaign-level `concurrency_limit` with MVP default of 5.
- [x] Enqueue initial call rows for campaign contacts.
- [x] Dispatch outbound calls in bounded parallel batches.
- [x] Refill available call slots as active calls complete.
- [x] Add loading, empty, and error states.
- [x] Add tests for campaign creation and start behavior.

### Acceptance Criteria
- [x] `POST /api/campaigns/:id/start` requires admin protection.
- [x] Starting a draft campaign queues one initial call per valid contact.
- [x] Starting a campaign dispatches multiple simultaneous calls up to `concurrency_limit`.
- [x] Starting an already-running campaign does not duplicate calls.

## Phase 6: Calling Provider Integration
- [x] Implement Plivo `createCall`. Spec: [architecture](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md#architecture). Plan: [Task 5 - Build Plivo Call Start and Answer XML](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-5-build-plivo-call-start-and-answer-xml). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).
- [x] Implement Plivo answer response builder. Spec: [audio format](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md#audio-format). Plan: [Task 5 - Build Plivo Call Start and Answer XML](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-5-build-plivo-call-start-and-answer-xml). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).
- [x] Implement Plivo hangup webhook parser. Spec: [Plivo hangup contract](docs/api.md#post-apiwebhooksplivohangup). Plan: [Task 5 - Configure Plivo Routing](docs/superpowers/plans/2026-05-27-hosting-distribution-shipping.md#task-5-configure-plivo-routing). Acceptance: [provider integration criteria](#acceptance-criteria-2).
- [x] Implement Plivo recording webhook parser. Spec: [Plivo recording contract](docs/api.md#post-apiwebhooksplivorecording). Plan: [Task 5 - Configure Plivo Routing](docs/superpowers/plans/2026-05-27-hosting-distribution-shipping.md#task-5-configure-plivo-routing). Acceptance: [provider integration criteria](#acceptance-criteria-2).
- [x] Persist provider call IDs in the local campaign store for outbound attempts. Spec: [database outcome](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md#database-outcome). Plan: [Task 5 - Build Plivo Call Start and Answer XML](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-5-build-plivo-call-start-and-answer-xml). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).
- [x] Map provider statuses into internal statuses. Spec: [shared enums](docs/api.md#shared-enums). Plan: [Task 3 - Add Domain Types and Agent Instructions](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-3-add-domain-types-and-agent-instructions). Acceptance: [provider integration criteria](#acceptance-criteria-2).
- [x] Save raw provider payloads in `call_events`. Spec: [idempotency](docs/api.md#idempotency) and [Plivo hangup contract](docs/api.md#post-apiwebhooksplivohangup). Acceptance: [provider integration criteria](#acceptance-criteria-2).
- [x] Add idempotency tests for duplicate webhook events. Spec: [idempotency](docs/api.md#idempotency). Acceptance: [provider integration criteria](#acceptance-criteria-2).
- [x] Add simulated callback route or test helper for demo mode. Spec: [simulated callback contract](docs/api.md#post-apiwebhookssimulatedcall-event). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).
- [x] Add live-call preflight validation for Plivo, public answer URL, voice bridge URL, and voice bridge OpenAI key. Spec: [service boundary](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md#service-boundary). Plan: [Required environment variables](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#required-environment-variables). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).

### Acceptance Criteria
- [x] Provider webhooks validate signature or shared secret before state changes.
- [x] Duplicate provider callbacks append at most one effective state transition.
- [x] Terminal call states cannot move back to non-terminal states.

## Phase 7: Conversation and AI Classification
- [x] Create Hindi primary script pack.
- [x] Create English secondary script pack.
- [x] Add scripted language pack configuration for additional Indian languages.
- [x] Add language fallback rules: missing or unsupported `language_hint` falls back to Hindi.
- [x] Strengthen voice-agent instructions so the caller can request a supported language switch mid-call.
- [x] Add UI-editable prompt variables with `UDS` as the default company name for live and manual campaigns. Spec: [agent settings](docs/superpowers/specs/2026-05-28-dashboard-agent-settings-history-design.md#agent-settings). Plan: [Task 1 - Add Agent Settings Domain Types](docs/superpowers/plans/2026-05-28-dashboard-agent-settings-history.md#task-1-add-agent-settings-domain-types). Acceptance: [agent settings and history criteria](docs/superpowers/specs/2026-05-28-dashboard-agent-settings-history-design.md#acceptance-criteria).
- [x] Add dashboard-editable agent voice, tone, language, prompt enhancement, and self-improve settings for future calls. Spec: [dashboard UX](docs/superpowers/specs/2026-05-28-dashboard-agent-settings-history-design.md#dashboard-ux). Plan: [Task 5 - Add Dashboard Controls and History](docs/superpowers/plans/2026-05-28-dashboard-agent-settings-history.md#task-5-add-dashboard-controls-and-history). Acceptance: [agent settings and history criteria](docs/superpowers/specs/2026-05-28-dashboard-agent-settings-history-design.md#acceptance-criteria).
- [x] Add Indian female and Indian male natural voice presets backed by OpenAI Realtime voice IDs. Spec: [OpenAI voice compatibility](docs/superpowers/specs/2026-05-28-dashboard-agent-settings-history-design.md#openai-and-elevenlabs-voice-compatibility). Plan: [Task 1 - Add Agent Settings Domain Types](docs/superpowers/plans/2026-05-28-dashboard-agent-settings-history.md#task-1-add-agent-settings-domain-types). Acceptance: [agent settings and history criteria](docs/superpowers/specs/2026-05-28-dashboard-agent-settings-history-design.md#acceptance-criteria).
- [x] Snapshot campaign agent settings onto each call at call start. Spec: [realtime bridge flow](docs/superpowers/specs/2026-05-28-dashboard-agent-settings-history-design.md#realtime-bridge-flow). Plan: [Task 2 - Snapshot Settings on Campaign Calls](docs/superpowers/plans/2026-05-28-dashboard-agent-settings-history.md#task-2-snapshot-settings-on-campaign-calls). Acceptance: [agent settings and history criteria](docs/superpowers/specs/2026-05-28-dashboard-agent-settings-history-design.md#acceptance-criteria).
- [x] Include prompt enhancement and self-improvement guidance in the OpenAI Realtime system prompt. Spec: [voice agent behavior](docs/superpowers/specs/2026-05-28-dashboard-agent-settings-history-design.md#voice-agent-behavior). Plan: [Task 4 - Wire Settings Into Plivo and Realtime](docs/superpowers/plans/2026-05-28-dashboard-agent-settings-history.md#task-4-wire-settings-into-plivo-and-realtime). Acceptance: [agent settings and history criteria](docs/superpowers/specs/2026-05-28-dashboard-agent-settings-history-design.md#acceptance-criteria).
- [x] Add receiver attitude detection fields and improvement notes for future-call guidance. Spec: [voice agent behavior](docs/superpowers/specs/2026-05-28-dashboard-agent-settings-history-design.md#voice-agent-behavior). Plan: [Task 2 - Snapshot Settings on Campaign Calls](docs/superpowers/plans/2026-05-28-dashboard-agent-settings-history.md#task-2-snapshot-settings-on-campaign-calls). Acceptance: [agent settings and history criteria](docs/superpowers/specs/2026-05-28-dashboard-agent-settings-history-design.md#acceptance-criteria).
- [x] Improve explicit-request language switching speed in the realtime bridge. Spec: [switching policy](docs/superpowers/specs/2026-05-27-openai-realtime-multilingual-voice-agent-design.md#switching-policy). Plan: [Realtime session and state machine](docs/superpowers/specs/2026-05-27-openai-realtime-multilingual-voice-agent-design.md#realtime-session-and-state-machine). Acceptance: [multilingual realtime criteria](docs/superpowers/specs/2026-05-27-openai-realtime-multilingual-voice-agent-design.md#acceptance-criteria).
- [x] Add deterministic yes/no/unclear classifier fallback.
- [x] Add AI helper for language detection.
- [x] Add AI helper for transcript summarization.
- [x] Add AI helper for disposition extraction.
- [x] Add post-call behavior verification scoring for language/tone adherence and QA notes on each call.
- [x] Upgrade deterministic receiver sentiment detection with confidence-style scoring and richer behavior categories.
- [x] Add dedicated Prompt Studio panel with blended system prompt preview and copy support.
- [x] Persist `confidence` internally or in metadata.
- [x] Route low-confidence calls to `manual_review`.
- [x] Add tests for disposition mapping and next-action rules.

### Acceptance Criteria
- [x] Simulated callbacks can include transcript text for classification.
- [x] Live provider path stores recording URL and transcript source metadata.
- [x] Low-confidence AI output becomes `manual_review`.

## Phase 8: Retry and Reconciliation
- [x] Add retry policy model.
- [x] Implement `POST /api/calls/:id/retry`.
- [x] Implement `GET /api/cron/retry-unanswered`.
- [x] Implement `GET /api/cron/reconcile-provider-status`.
- [x] Protect cron routes with `CRON_SECRET`.
- [x] Add tests for retry limits and terminal states.

### Acceptance Criteria
- [x] `GET /api/cron/retry-unanswered` requires `CRON_SECRET`.
- [x] Retry does not exceed campaign retry limit.
- [x] Completed, confirmed, declined, invalid, and manual-review calls are not retried automatically.

## Phase 9: Dashboard and Export
- [x] Build campaign list view.
- [x] Build campaign detail dashboard.
- [x] Build call result detail page.
- [x] Show original uploaded row details in the campaign results table.
- [x] Add a manual one-number quick-check flow in the dashboard.
- [x] Replace the mobile results table with card-style rows to remove page-level horizontal scrolling.
- [x] Add filters by status, disposition, and language.
- [x] Add recording and transcript display.
- [x] Show live call status history, transcript text, receiver attitude, and voice/tone/language snapshot in the dashboard. Spec: [dashboard UX](docs/superpowers/specs/2026-05-28-dashboard-agent-settings-history-design.md#dashboard-ux). Plan: [Task 5 - Add Dashboard Controls and History](docs/superpowers/plans/2026-05-28-dashboard-agent-settings-history.md#task-5-add-dashboard-controls-and-history). Acceptance: [agent settings and history criteria](docs/superpowers/specs/2026-05-28-dashboard-agent-settings-history-design.md#acceptance-criteria).
- [x] Ensure quick number check campaigns copy the selected dashboard campaign's saved agent settings before call start.
- [x] Redesign the campaigns workspace with a hackathon-ready product name and cleaner intake UX.
- [x] Add intake mode choices for single number, number list, and CSV/XLSX upload.
- [x] Mirror core agent configuration options in the intake panel and the Agent Settings panel so quick checks and uploads use the same settings model.
- [x] Add CSV export for all result rows, engineer-ready rows, and follow-up rows.
- [x] Ensure CSV export includes original uploaded columns plus call status, disposition, recording URL, transcript status, summary, next action, attempt number, last call time, and retry eligibility.
- [x] Add mobile responsive checks.
- [x] Add e2e test for upload-to-export demo workflow.
- [ ] Design parity pass: add desktop sidebar entries for New Campaign, Exports, and Settings plus a mobile bottom nav for Campaigns, Upload, Results, and Settings.
- [ ] Design parity pass: add campaign detail sticky subnav sections (Overview, Calls, Import, Exports, Audit).
- [ ] Design parity pass: implement status and disposition distribution bars and add concise text summaries near each visualization.
- [ ] Design parity pass: extend results filters with provider, retry eligibility, transcript availability, recording availability, and search by name/phone/order/location.
- [ ] Design parity pass: preserve results filters in URL query params instead of component-only state.
- [ ] Design parity pass: add a live activity event feed with source tags (system, provider webhook, cron, admin, simulated).
- [ ] Design parity pass: add export builder controls (disposition/status filters, include alternate phone/summary/recording URL) and preview rows before generation.
- [ ] Design parity pass: add provider readiness statuses and masked secret statuses in a dedicated settings surface.
- [ ] Design parity pass: add accessibility sweep items from `design.md` (skip link, icon-button accessible names, aria-live for live updates/toasts, keyboard flow checks).

### Acceptance Criteria
- [x] Dashboard shows the hackathon golden path states from seeded or uploaded contacts.
- [x] Dashboard shows uploaded name, phone, location, and business details beside call outcomes.
- [x] Call detail shows transcript, summary, disposition, next action, and recording URL.
- [x] Export includes confirmed pickup and follow-up rows with original uploaded details and appended result columns.

## Phase 10: Security and Reliability
- [x] Re-check provider webhook signatures or shared secrets where supported.
- [x] Add clear error responses without leaking secrets.
- [x] Ensure `.env` is never read directly outside config.
- [x] Re-check rate limits or basic admin protection for write routes.
- [x] Add audit events for meaningful state changes.
- [x] Add tests for invalid inputs and duplicate callbacks.
- [x] Add recording and transcript access policy.
- [x] Add retention or deletion decision for sensitive call evidence.

## Hackathon Golden Path Milestone
- [x] Add sample Excel file with 10 contacts.
- [x] Add sample CSV file with 10 contacts.
- [x] Upload sample file and create campaign.
- [x] Start campaign and queue calls.
- [x] Confirm multiple calls can be active simultaneously within the configured limit.
- [x] Simulate callbacks for at least 8 calls.
- [x] Classify at least 3 confirmed pickups, 2 follow-up needed, 1 invalid number, and 1 not picked.
- [x] Show dashboard status totals.
- [x] Open one completed call detail.
- [x] Export engineer-ready CSV.
- [x] Confirm exported CSV preserves uploaded details and includes status, recording link, summary, disposition, next action, and retry fields.

## Phase 11: Documentation
- [x] Create `design.md` UI and UX design specification.
- [x] Apply UI-UX-Pro-Max quality pass to `design.md`.
- [x] Create and link [2026-05-26 progress summary](docs/daily-summary-2026-05-26.md) in TASKS.md.
- [x] Create `Memory.md` crash-resume checkpoint for 2026-05-27.
- [x] Update `README.md` with final setup commands.
- [x] Update `README.md` with provider setup steps.
- [x] Update `docs/api.md` as route contracts change.
- [x] Record provider and stack decisions in `docs/decisions.md`.
- [x] Update `CHANGELOG.md` after each meaningful milestone.

## Phase 12: Deployment Readiness
- [x] Add Vercel configuration for cron jobs.
- [x] Add Railway service configuration for the Node WebSocket voice bridge. Spec: [service boundary](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md#service-boundary). Plan: [Task 1 - Add Deployment Configuration](docs/superpowers/plans/2026-05-27-hosting-distribution-shipping.md#task-1-add-deployment-configuration). Acceptance: [production smoke test](docs/superpowers/plans/2026-05-27-hosting-distribution-shipping.md#task-6-production-smoke-test).
- [x] Add Render service configuration and health-check support for the Node WebSocket voice bridge. Spec: [service boundary](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md#service-boundary). Plan: [Task 3 - Deploy Railway Voice Bridge](docs/superpowers/plans/2026-05-27-hosting-distribution-shipping.md#task-3-deploy-railway-voice-bridge). Acceptance: [production smoke test](docs/superpowers/plans/2026-05-27-hosting-distribution-shipping.md#task-6-production-smoke-test).
- [x] Configure Supabase or database connection. Spec: [database outcome](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md#database-outcome). Plan: [Task 4 - Configure Supabase](docs/superpowers/plans/2026-05-27-hosting-distribution-shipping.md#task-4-configure-supabase). Acceptance: [production smoke test](docs/superpowers/plans/2026-05-27-hosting-distribution-shipping.md#task-6-production-smoke-test).
- [x] Configure provider webhook URLs. Spec: [endpoint map](docs/superpowers/plans/2026-05-27-hosting-distribution-shipping.md#endpoint-map). Plan: [Task 5 - Configure Plivo Routing](docs/superpowers/plans/2026-05-27-hosting-distribution-shipping.md#task-5-configure-plivo-routing). Acceptance: [production smoke test](docs/superpowers/plans/2026-05-27-hosting-distribution-shipping.md#task-6-production-smoke-test).
- [x] Configure `APP_BASE_URL`, `VOICE_BRIDGE_PUBLIC_WS_URL`, and `VOICE_OUTCOME_SECRET` across Vercel and Railway. Spec: [environment variable map](docs/superpowers/plans/2026-05-27-hosting-distribution-shipping.md#environment-variable-map). Plan: [Task 3 - Deploy Railway Voice Bridge](docs/superpowers/plans/2026-05-27-hosting-distribution-shipping.md#task-3-deploy-railway-voice-bridge). Acceptance: [production smoke test](docs/superpowers/plans/2026-05-27-hosting-distribution-shipping.md#task-6-production-smoke-test).
- [x] Add local `/api/health` smoke test. Spec: [endpoint map](docs/superpowers/plans/2026-05-27-hosting-distribution-shipping.md#endpoint-map). Plan: [Task 2 - Deploy Vercel Web App](docs/superpowers/plans/2026-05-27-hosting-distribution-shipping.md#task-2-deploy-vercel-web-app). Acceptance: [production smoke test](docs/superpowers/plans/2026-05-27-hosting-distribution-shipping.md#task-6-production-smoke-test).
- [x] Add Render bridge speech-first flow, stream-status handling, and recording callback persistence for live Plivo calls. Spec: [service boundary](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md#service-boundary) and [database outcome](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md#database-outcome). Plan: [Task 6 - Build Voice Bridge Plivo Side](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-6-build-voice-bridge-plivo-side), [Task 8 - Save Final Voice Outcome](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-8-save-final-voice-outcome), and [manual end-to-end plan](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-10-manual-end-to-end-test). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).
- [x] Add Railway bridge startup or health smoke test. Spec: [service boundary](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md#service-boundary). Plan: [manual end-to-end plan](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-10-manual-end-to-end-test). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).
- [x] Verify Plivo answer XML points AudioStream to the Railway `wss://` URL. Spec: [audio format](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md#audio-format). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).
- [x] Verify voice bridge can post final outcomes back to Vercel. Spec: [database outcome](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md#database-outcome). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).
- [x] Add deployment smoke test checklist. Spec: [manual end-to-end plan](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-10-manual-end-to-end-test). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).
- [x] Run `.\scripts\verify.ps1`. Plan: [Task 11 - Update Documentation and Tasks](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-11-update-documentation-and-tasks). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).
- [x] Deploy the Vercel web app with Hobby-safe cron schedules and confirm `/api/health` responds. Spec: [hosting decision](docs/superpowers/plans/2026-05-27-hosting-distribution-shipping.md#hosting-decision). Plan: [Task 2 - Deploy Vercel Web App](docs/superpowers/plans/2026-05-27-hosting-distribution-shipping.md#task-2-deploy-vercel-web-app). Acceptance: [production smoke test](docs/superpowers/plans/2026-05-27-hosting-distribution-shipping.md#task-6-production-smoke-test).
- [x] Move the demo file store to a writable temp directory on Vercel so uploads do not fail with `/var/task/.data` write errors. Spec: [hosting decision](docs/superpowers/plans/2026-05-27-hosting-distribution-shipping.md#hosting-decision). Acceptance: [production smoke test](docs/superpowers/plans/2026-05-27-hosting-distribution-shipping.md#task-6-production-smoke-test).
- [x] Perform demo rehearsal with seeded or live contacts. Spec: [realtime Plivo demo](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#realtime-plivo-voice-demo). Plan: [Task 10 - Manual End-to-End Test](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-10-manual-end-to-end-test). Acceptance: [production smoke test](docs/superpowers/plans/2026-05-27-hosting-distribution-shipping.md#task-6-production-smoke-test).

## First Implementation Slice
- [x] Scaffold Next.js App Router TypeScript project with Tailwind and tests. Spec: [MVP scope](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md#mvp-scope-for-tomorrow). Plan: [Task 1 - Scaffold Next.js and Verification](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-1-scaffold-nextjs-and-verification). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).
- [x] Add config layer with `.env.example` alignment. Spec: [voice selection](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md#voice-selection). Plan: [Task 2 - Add Environment Validation](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-2-add-environment-validation). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).
- [x] Add minimal admin auth, webhook auth, and cron auth helpers. Spec: [API authentication](docs/api.md#authentication). Plan: [Task 1 - Scaffold Next.js and Verification](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-1-scaffold-nextjs-and-verification). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).
- [x] Add enums and pure domain helpers for statuses, dispositions, and next actions. Spec: [shared enums](docs/api.md#shared-enums). Plan: [Task 3 - Add Domain Types and Agent Instructions](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-3-add-domain-types-and-agent-instructions). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).
- [x] Build Plivo outbound call start API. Spec: [architecture](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md#architecture). Plan: [Task 5 - Build Plivo Call Start and Answer XML](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-5-build-plivo-call-start-and-answer-xml). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).
- [x] Build Plivo answer URL that returns bidirectional AudioStream XML. Spec: [audio format](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md#audio-format). Plan: [Task 5 - Build Plivo Call Start and Answer XML](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-5-build-plivo-call-start-and-answer-xml). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).
- [x] Build Node WebSocket voice bridge for Plivo AudioStream. Spec: [service boundary](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md#service-boundary). Plan: [Task 6 - Build Voice Bridge Plivo Side](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-6-build-voice-bridge-plivo-side). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).
- [x] Connect voice bridge to OpenAI Realtime with configurable voice. Spec: [voice selection](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md#voice-selection). Plan: [Task 7 - Connect Voice Bridge to OpenAI Realtime](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-7-connect-voice-bridge-to-openai-realtime). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).
- [x] Add Hindi-first realtime agent prompt rules: start in Hindi, switch to English only when configured or requested, and use configured regional packs when available. Spec: [voice agent behavior](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md#voice-agent-behavior). Plan: [Task 3 - Add Domain Types and Agent Instructions](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-3-add-domain-types-and-agent-instructions). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).
- [x] Save realtime call transcript and outcome to database. Spec: [database outcome](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md#database-outcome). Plan: [Task 8 - Save Final Voice Outcome](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-8-save-final-voice-outcome). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).
- [x] Show realtime call outcome in MVP dashboard. Spec: [acceptance criteria](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md#acceptance-criteria). Plan: [Task 9 - Add MVP Dashboard](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-9-add-mvp-dashboard). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).
- [x] Add unit tests for status and disposition mapping. Spec: [testing strategy](docs/architecture.md#testing-strategy). Plan: [Task 3 - Add Domain Types and Agent Instructions](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-3-add-domain-types-and-agent-instructions). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).
- [x] Run verify script and update this checklist. Plan: [Task 11 - Update Documentation and Tasks](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-11-update-documentation-and-tasks). Acceptance: [slice criteria](#first-implementation-slice-acceptance-criteria).

### First Implementation Slice Acceptance Criteria
Source: [approved spec acceptance criteria](docs/superpowers/specs/2026-05-26-realtime-plivo-voice-agent-design.md#acceptance-criteria) and [manual end-to-end plan](docs/superpowers/plans/2026-05-26-realtime-plivo-voice-agent.md#task-10-manual-end-to-end-test).

- [x] A call can be started from `POST /api/calls/start` or a dashboard action using an existing call row.
- [ ] Plivo fetches the app answer URL after the outbound call is answered.
  - Blocked on a real Plivo answered-call smoke test with production credentials and a public callback URL.
- [x] The answer URL returns bidirectional Plivo AudioStream XML, not Speak-only XML.
- [x] The voice bridge receives Plivo `start` and `media` events for the call.
- [x] The voice bridge opens one OpenAI Realtime session per Plivo stream.
- [x] The OpenAI Realtime session uses `OPENAI_REALTIME_MODEL` and `OPENAI_REALTIME_VOICE`.
- [x] The OpenAI Realtime session uses Hindi as the default call language unless a supported override is present.
- [x] OpenAI audio deltas are sent back to Plivo with `playAudio` so the customer hears the AI voice.
- [x] Transcript text or a conservative conversation summary is saved for the call.
- [x] The saved call row has a disposition and next action after the call closes.
- [x] The MVP dashboard shows the realtime call status, disposition, next action, and summary.
- [x] A simulated callback fallback remains available for demo resilience.
