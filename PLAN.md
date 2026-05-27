# MVP Product and Execution Plan

## Clear Problem Statement
Operations teams manage pickup or de-installation readiness through spreadsheets and manual phone calls. The work is slow, inconsistent, hard to audit, and difficult to scale across Indian languages.

The MVP should prove one simple promise:

> Upload an Excel or CSV contact sheet, run a bounded-parallel outbound calling campaign, classify the call outcomes, and export the rows that operations can act on.

The product should optimize for demo reliability and operational clarity, not for broad automation. If live telephony is blocked, the simulated callback path must still demonstrate the full workflow.

## Target User

### Primary User
Logistics or field operations manager at an India-focused operations team.

They need to:
- Confirm whether machines, products, or equipment are ready for pickup or engineer de-installation.
- Reduce manual calling work.
- See which contacts confirmed, declined, did not answer, or need follow-up.
- Export clean rows for the field team.

### Secondary Users
- Operations analyst reviewing transcripts, summaries, recordings, and manual-review calls.
- Founder or ops lead demoing the workflow and checking business viability.
- Support team running structured outbound campaigns for operational follow-up.

## Basic Product Journey

```text
1. Admin signs in
2. Admin uploads Excel or CSV contact sheet
3. App validates required columns and skips duplicates
4. Admin configures campaign settings
5. Admin starts campaign
6. App queues calls and dispatches multiple active calls within the campaign limit
7. Provider or simulator sends call events
8. App updates technical call status
9. App classifies business disposition from transcript or simulated transcript
10. Admin monitors uploaded details and enriched call results in the dashboard
11. Admin opens call detail for evidence
12. Admin exports confirmed pickup and follow-up rows as CSV with original uploaded columns plus call-result columns
```

## User Flow

### Flow 1: Upload to Draft Campaign
1. User opens Campaigns.
2. User selects New campaign.
3. User uploads `.xlsx` or `.csv` file.
4. App validates required columns:
   - `provider_name`
   - `phone`
   - `location`
   - `machine_count`
   - `order_id`
5. App reports imported rows, invalid rows, duplicates, and preserved source columns.
6. User fixes file or continues with valid rows.
7. App creates a draft campaign.

### Flow 2: Configure and Start Campaign
1. User enters campaign name and company name.
2. User selects provider:
   - Simulated for guaranteed demo.
   - Plivo for live stretch goal.
3. User selects default language, retry limit, and calling window.
4. User reviews readiness checklist.
5. User starts campaign.
6. App queues one call attempt per valid contact.
7. App dispatches multiple active calls up to the campaign concurrency limit.

### Flow 3: Monitor Results
1. User opens campaign dashboard.
2. User sees technical states: queued, ringing, answered, completed, failed, not picked, invalid number.
3. User sees business outcomes: confirmed pickup, declined, follow-up needed, manual review.
4. User filters by disposition, status, language, or retry eligibility.
5. User sees original uploaded columns alongside status, disposition, recording link, summary, next action, and retry eligibility.
6. User opens a call detail to inspect transcript, summary, recording URL, next action, and audit timeline.

### Flow 4: Export Operations Rows
1. User opens Export.
2. User chooses confirmed pickup, follow-up needed, or filtered results.
3. App previews included uploaded columns and appended result columns.
4. User generates CSV.
5. Field team receives only operationally useful rows, not raw provider payloads or secrets.

## MVP Scope Decided

The MVP is a reliable campaign workflow with a deterministic demo fallback.

### Included in MVP
- Simple admin access.
- Excel and CSV upload.
- Contact validation and deduplication.
- Original uploaded column preservation for portal display and export.
- Campaign creation and start.
- Bounded parallel call dispatch with a default concurrency limit of 5 active calls.
- Dashboard with campaign stats and call results.
- Provider adapter interface.
- Plivo-first adapter path.
- Twilio and Exotel scaffolds.
- Simulated callback mode.
- Webhook ingestion with idempotent event handling.
- Hindi-first scripted call flow.
- English secondary scripted call flow.
- Additional Indian language pack configuration.
- Transcript-based or simulated-transcript classification.
- Disposition and next-action mapping.
- Retry eligibility for not-picked and not-connected calls.
- Call detail with transcript, summary, language, recording URL, disposition, and audit timeline.
- CSV export for confirmed pickup and follow-up rows with original uploaded columns plus call-result columns.
- Split deployment readiness: Vercel for dashboard/API/webhooks/cron, Supabase for data, and Railway or equivalent always-on container hosting for the realtime voice bridge.

### Explicitly Out of MVP
- Full multi-tenant roles and permissions.
- Advanced CRM integrations.
- Complex call center routing.
- Perfect open-ended voice agent behavior.
- Automatic engineer assignment optimization.
- Full legal consent workflow beyond placeholder copy and configuration.
- Production retention/deletion automation for recordings and transcripts.
- Full live multilingual conversation quality across all listed languages beyond Hindi and English.

## Must-Have Features

These are required to demo the core value.

1. Project scaffold
   - Next.js App Router with TypeScript.
   - Tailwind CSS.
   - Test runner.
   - `scripts/setup.sh` and `scripts/verify.sh` aligned with the stack.

2. Configuration and security foundation
   - Config layer for environment variables.
   - Simple admin auth gate.
   - Webhook shared-secret or signature validation helper.
   - Cron authorization helper.
   - No direct secret access outside config.

3. Domain model
   - Campaign statuses.
   - Call statuses.
   - Dispositions.
   - Next actions.
   - Retry rules.
   - Terminal-state rules.

4. Contact ingestion
   - Upload Excel or CSV file.
   - Validate required columns.
   - Normalize phone numbers.
   - Validate machine count.
   - Deduplicate by campaign, phone, and order ID.
   - Preserve all original uploaded columns.
   - Show import summary.

5. Campaign workflow
   - Create campaign.
   - Start campaign.
   - Queue calls once.
   - Dispatch active calls in bounded parallel batches.
   - Prevent duplicate queueing.

6. Demo-safe calling path
   - Simulated provider callback route or helper.
   - Plivo adapter skeleton or first live implementation.
   - Provider event audit rows.
   - Idempotent callback handling.

7. Classification
   - Deterministic yes/no/unclear fallback.
   - Summary, disposition, next action, language, and confidence fields.
   - Low confidence becomes manual review.

8. Dashboard and call detail
   - Campaign stats.
   - Results table.
   - Original uploaded details displayed beside result fields.
   - Filters.
   - Call detail page.
   - Transcript, summary, recording URL, language, disposition, next action.

9. Export
   - Confirmed pickup CSV.
   - Follow-up CSV or filtered export.
   - Original uploaded columns plus status, disposition, recording URL, summary, next action, attempt, and retry columns.
   - Exclude secrets and raw provider payloads.

10. Verification
   - Unit tests for domain rules.
   - Integration tests for upload and campaign start.
   - Webhook idempotency tests.
   - Demo workflow smoke test if time allows.

## Nice-to-Have Features

These improve polish but should not block the demo.

- Live Plivo calling if provider setup is ready.
- Provider recording webhook fully wired.
- Provider transcription integration.
- Twilio implementation beyond scaffold.
- Exotel implementation beyond scaffold.
- Vercel Cron retry and reconciliation fully deployed.
- Audio player with real recordings.
- Language mismatch switching during live calls.
- Bulk retry UI.
- Advanced dashboard charts.
- Saved exports history.
- Mobile-first polish beyond basic responsive support.
- Retention policy automation.
- More complete admin session management.

## Fast Execution Plan

## Hosting, Distribution, and Shipping Plan

### Recommended Hosting Split
- **Vercel:** host the Next.js dashboard, upload/campaign APIs, Plivo answer/status/recording webhook routes, export routes, and cron retry/reconciliation routes.
- **Railway:** host the Node WebSocket voice bridge because Plivo AudioStream and OpenAI Realtime need a persistent bidirectional connection that should not run in Vercel serverless functions.
- **Supabase:** host Postgres tables, migrations, and optional storage for generated exports or uploaded source files.
- **Plivo:** place outbound calls and call the Vercel answer URL; the answer XML then connects Plivo AudioStream to the Railway WebSocket URL.

### Environment Routing
- `APP_BASE_URL` points to the Vercel deployment URL.
- `VOICE_BRIDGE_PUBLIC_WS_URL` points to the Railway WebSocket route, for example `wss://voice-bridge-production.up.railway.app/plivo/audio-stream`.
- `VOICE_OUTCOME_SECRET` is shared between Vercel and Railway so the bridge can post final call outcomes back to `/api/voice/outcome`.
- Plivo credentials live in Vercel for call creation and webhook validation. The bridge only needs OpenAI Realtime, outcome posting, and bridge runtime secrets.

### Distribution
- Use Vercel preview deployments for every branch or pull request once the repository is connected.
- Use one Vercel production deployment for the admin portal and API.
- Use one Railway production service for the voice bridge.
- Use one Supabase project for MVP production data, with local or separate preview data only if time allows.
- Point the customer-facing admin domain to Vercel. The Railway bridge can use its platform domain unless a custom subdomain is needed for trust or observability.

### Shipping Checklist
1. Run `scripts/verify.sh` locally once the stack exists.
2. Deploy the Vercel preview and confirm `/api/health`.
3. Deploy the Railway bridge and confirm its health or startup logs.
4. Set Vercel env vars: app URL, database URL, Plivo keys, OpenAI key, cron secret, webhook secret, language settings, and bridge URL.
5. Set Railway env vars: OpenAI key, realtime model/voice, outcome secret, app base URL, primary/supported languages, and bridge port.
6. Apply Supabase migrations.
7. Configure Plivo webhook URLs to the Vercel deployment.
8. Start one simulated campaign and verify dashboard/export.
9. Start one live Plivo test call and verify Plivo stream logs on Railway, final outcome on Vercel, and call result in the portal.
10. Promote the same configuration to production after the demo smoke test passes.

## Day 1: Stack and Foundation

Goal: make the repo executable and establish safe boundaries.

Tasks:
- Scaffold Next.js App Router TypeScript app.
- Add Tailwind CSS.
- Add Vitest or equivalent test runner.
- Wire `scripts/setup.sh` and `scripts/verify.sh` to real commands.
- Add config layer.
- Add admin, webhook, and cron auth helpers.
- Add domain enums and status metadata.
- Add unit tests for statuses, dispositions, next actions, and retry eligibility.

Done when:
- `npm run lint`, `npm run test`, and `npm run build` exist.
- `scripts/verify.sh` runs the app checks.
- No feature route reads secrets directly.

## Day 2: Data, Upload, and Campaign Creation

Goal: turn a spreadsheet into a draft campaign.

Tasks:
- Choose Supabase Postgres or local Postgres-compatible migration path.
- Add migrations for campaigns, contacts, calls, and call events.
- Build Excel parser.
- Build CSV parser using the same canonical validation contract.
- Validate required columns.
- Normalize phone numbers.
- Deduplicate contacts.
- Create upload API.
- Build upload UI and import summary.
- Add tests for missing columns, invalid rows, and duplicates.

Done when:
- A sample 10-row file creates a draft campaign.
- Invalid rows are visible and do not block valid rows.
- Duplicate rows are skipped consistently.

## Day 3: Campaign Start, Dashboard, and Simulator

Goal: show the full demo loop without relying on live telephony.

Tasks:
- Add campaign start API.
- Queue one call per valid contact.
- Add bounded parallel dispatch with a default concurrency limit of 5.
- Build campaign list and campaign detail dashboard.
- Build simulated callback route or helper.
- Append call event audit rows.
- Apply valid status transitions only.
- Add deterministic demo callback fixtures.
- Add idempotency tests.

Done when:
- Starting a campaign queues calls once.
- Simulated callbacks update dashboard stats.
- Duplicate callback events do not duplicate state changes.

## Day 4: Classification, Call Detail, and Export

Goal: make outcomes operationally useful.

Tasks:
- Add Hindi primary script pack.
- Add English secondary script pack.
- Add language pack records for additional Indian languages.
- Implement deterministic transcript classifier.
- Add AI helper interfaces for later language detection, summary, and disposition extraction.
- Build call detail page.
- Build CSV export for confirmed pickup and follow-up rows with original uploaded columns plus result columns.
- Add tests for classification and export fields.

Done when:
- At least 8 simulated callbacks produce visible results.
- At least 3 confirmed pickups and 2 follow-ups are classified.
- One completed call shows transcript, summary, disposition, next action, language, and recording placeholder.
- Confirmed pickup CSV downloads.
- Exported CSV includes uploaded business details plus status, disposition, recording link, summary, and next action.

## Day 5: Polish, Reliability, and Demo Rehearsal

Goal: make the demo boring in the best way.

Tasks:
- Tighten dashboard empty, loading, and error states.
- Add mobile responsive checks.
- Add provider readiness indicators.
- Add retry eligibility display.
- Run full verification.
- Rehearse demo from upload to export.
- Fix only demo-blocking bugs.
- Update README with exact setup and demo commands.

Done when:
- Demo can run end-to-end in under 5 minutes.
- `scripts/verify.sh` passes.
- The simulated path works even if Plivo is unavailable.

## Recommended Build Order

1. Scaffold app and test stack.
2. Add config, auth helpers, and domain rules.
3. Add database schema.
4. Build upload API and parser.
5. Build campaign creation and start.
6. Build dashboard.
7. Build simulated callback path.
8. Add classifier.
9. Build call detail.
10. Build export.
11. Add Plivo live path if time remains.
12. Polish and rehearse.

## Scope Control Rules

- If a feature does not help upload, start, monitor, classify, or export, defer it.
- If live provider setup blocks progress, use simulator immediately.
- If AI classification is unreliable, use deterministic fallback first.
- If UI polish competes with backend reliability, prioritize reliability.
- If a route changes campaign or call state, protect it before exposing it.
- If a workflow cannot be tested quickly, simplify it.

## Demo Success Criteria

The MVP is successful when the demo can show:
- Upload or seed 10 contacts.
- Create and start one campaign.
- Queue 10 calls and run multiple active calls at once within the configured limit.
- Process at least 8 simulated or live callbacks.
- Show dashboard totals with confirmed pickup, follow-up, invalid number, and not-picked outcomes.
- Open one completed call detail with transcript, summary, language, disposition, next action, and recording URL or placeholder.
- Export engineer-ready CSV rows for confirmed pickups.
- Export includes the uploaded person/contact details plus new call-result columns.

## Immediate Next Task

Scaffold the Next.js App Router TypeScript project with Tailwind and tests, then update the setup and verify scripts so every later task has a real feedback loop.
