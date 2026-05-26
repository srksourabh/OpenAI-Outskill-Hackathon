# Product Requirements Document

## Product
Outbound AI Calling Agent for pickup and de-installation readiness operations.

## Problem
Operations teams often manage Excel sheets of provider, pickup-contact, or site-contact phone numbers. They manually call each contact to confirm whether machines, products, or equipment are ready for pickup or engineer de-installation. This process is slow, inconsistent, difficult to audit, and hard to run across Indian languages.

## Users
- Logistics teams confirming pickup readiness.
- Field operations teams scheduling engineer de-installation.
- Support or collections teams running structured outbound campaigns.
- Founders and operations managers who need auditable call outcomes.

## Core Use Cases
- Upload a sheet of provider names, phone numbers, locations, machine counts, order IDs, and optional language hints.
- Create and start an outbound calling campaign.
- Monitor real-time campaign status and call outcomes.
- Review recordings, transcripts, summaries, dispositions, and next actions.
- Retry unanswered or not-connected calls automatically.
- Export confirmed pickups and follow-up rows for operations handoff.

## MVP Scope
- Excel upload and parsing.
- Contact validation, normalization, and deduplication.
- Campaign creation with provider, default language, retry limit, and calling settings.
- Provider-agnostic telephony adapter interface.
- Plivo adapter implemented first.
- Twilio and Exotel adapter scaffolds.
- Outbound call initiation.
- Provider webhook ingestion for answer, status, hangup, and recording events.
- Idempotent event handling with call event audit rows.
- English and Hindi live scripted voice flow.
- Language pack configuration for Bengali, Punjabi, Gujarati, Marathi, Tamil, Telugu, Malayalam, Kannada, Odia, and Assamese.
- Transcript summarization, language detection, and disposition extraction.
- Dashboard with campaign stats, call details, filters, and CSV export.
- Retry scheduler for unanswered and not-connected calls.
- Vercel deployment readiness.
- Simulated provider callback mode for demo resilience.

## Out of Scope
- Perfect live multi-turn conversational quality across all Indian languages.
- Full production-grade legal consent workflows.
- Advanced CRM integrations.
- Full contact center routing.
- Automatic engineer assignment optimization.
- Multi-tenant enterprise roles and permissions beyond a simple admin MVP.

## Functional Requirements

### Campaign Management
- Create a campaign from an Excel upload.
- Configure provider selection: `plivo`, `twilio`, `exotel`, or future providers.
- Configure calling window, retry policy, and default language.
- Start, monitor, and export a campaign.
- Show progress, totals, completion rate, and disposition distribution.

### Contact Ingestion
Required Excel columns:

| Column | Required | Notes |
|---|---|---|
| `provider_name` | Yes | Recipient, provider, or company name. |
| `phone` | Yes | Prefer E.164 format. |
| `location` | Yes | Pickup or machine location. |
| `machine_count` | Yes | Integer quantity. |
| `order_id` | Yes | Business reference. |
| `language_hint` | No | Example: `hi`, `bn`, `ta`. |
| `alternate_phone` | No | Retry or fallback number. |
| `address` | No | Extended location details. |

### Calling Workflow
For each contact, the system should:
1. Validate or normalize the phone number.
2. Queue the call.
3. Initiate outbound call through the selected provider.
4. Track technical states: `queued`, `initiated`, `ringing`, `answered`, `completed`, `failed`, `not_picked`, `not_connected`, `invalid_number`, `voicemail`.
5. Record connected calls where provider support allows it.
6. Play a greeting script.
7. Ask whether pickup or de-installation is ready.
8. Detect yes, no, or uncertain response.
9. Ask one follow-up question if declined or unclear.
10. Save transcript, summary, reason code, recording URL, disposition, and next action.

### Conversation Script
- Greeting: `Hello, we are calling from {{company_name}} regarding order {{order_id}}.`
- Context: `We see {{machine_count}} machines/items at {{location}} ready for pickup or de-installation.`
- Question: `Can you confirm whether they are ready?`
- If yes: mark `confirmed_pickup` and set `next_action` to `send_engineer`.
- If no: ask for the reason and mark `declined` or `follow_up_needed`.
- If language mismatch is detected: switch to Hindi or the configured language pack where available.

### Business Outcomes
- `not_picked`
- `not_connected`
- `invalid_number`
- `voicemail`
- `confirmed_pickup`
- `declined`
- `follow_up_needed`
- `manual_review`

### Language Support

| Language | Code | MVP Mode |
|---|---|---|
| English | `en` | Full live |
| Hindi | `hi` | Full live |
| Bengali | `bn` | Scripted + classify |
| Punjabi | `pa` | Scripted + classify |
| Gujarati | `gu` | Scripted + classify |
| Marathi | `mr` | Scripted + classify |
| Tamil | `ta` | Scripted + classify |
| Telugu | `te` | Scripted + classify |
| Malayalam | `ml` | Scripted + classify |
| Kannada | `kn` | Scripted + classify |
| Odia | `or` | Scripted + classify |
| Assamese | `as` | Scripted + classify |

## Non-Functional Requirements
- Webhook handlers must be idempotent.
- Provider adapters must implement one common interface.
- Recording and transcript data must be queryable by call ID and campaign ID.
- Dashboard must work on desktop and mobile.
- System must tolerate webhook retries and partial provider failures.
- Critical state must not use `localStorage`.
- User input must be validated at boundaries.
- Secrets must never be hardcoded or committed.
- Admin-only routes must be protected before campaign write APIs are exposed.
- Recordings and transcripts must be treated as sensitive operational data.

## Data Model
Core entities:
- `campaigns`
- `contacts`
- `calls`
- `call_events`
- `language_assets`
- `exports`

See `docs/architecture.md` for the schema-oriented module plan.

## Hackathon Demo Golden Path
The first demo should optimize for reliability over breadth:

1. Upload a sample Excel file with 10 contacts.
2. Create a campaign using the default assumed stack: Supabase, Plivo adapter, and simulated callback fallback.
3. Start the campaign and queue 10 calls.
4. Simulate or receive provider callbacks for at least 8 calls.
5. Show dashboard totals with confirmed pickup, follow-up, invalid number, and not-picked outcomes.
6. Open one completed call detail with transcript text, summary, language, disposition, next action, and recording URL placeholder or live recording URL.
7. Export engineer-ready CSV rows for confirmed pickups.

Live Plivo calls are a stretch goal for the demo. The simulated path must remain available so the product can be demonstrated even if telephony setup, webhooks, or provider approval blocks live calling.

## API Surface
Primary routes:
- `POST /api/upload`
- `POST /api/campaigns`
- `POST /api/campaigns/:id/start`
- `GET /api/campaigns/:id`
- `GET /api/campaigns/:id/results`
- `POST /api/calls/:id/retry`
- `POST /api/webhooks/plivo/answer`
- `POST /api/webhooks/plivo/hangup`
- `POST /api/webhooks/plivo/recording`
- `POST /api/webhooks/twilio/status`
- `POST /api/webhooks/twilio/recording`
- `POST /api/webhooks/exotel/call-status`
- `GET /api/cron/retry-unanswered`
- `GET /api/cron/reconcile-provider-status`

See `docs/api.md` for contracts.

## Success Metrics
- Excel upload to campaign creation in under 2 minutes.
- First outbound batch starts in under 5 minutes.
- Deterministic technical outcome classification accuracy above 85%.
- Structured result is available for every completed answered call.
- Demo-ready support for English and Hindi, with visible configuration for additional Indian language packs.
- Hackathon demo can show upload, start campaign, callback updates, call detail, filtering, and export.

## Risks
- Provider account setup, webhook routing, or India telephony compliance may slow the live demo.
- Live speech quality may vary across providers and languages.
- Open-ended voice agent behavior can reduce reliability; deterministic script branches should be preferred for MVP.
- AI disposition extraction may need fallback rules and manual review when confidence is low.
- Vercel serverless time limits may affect long-running tasks; calls should be provider-driven and webhook-based.

## Open Questions
- Which legal entity or brand name should be used in the call greeting?
- Is Plivo approved and ready for live calls, or should the demo stay simulated-only?
- What phone number format and countries should be accepted beyond Indian E.164 numbers?
- What consent language is required before recording calls?
- Who is allowed to access recordings and exports in the MVP?
