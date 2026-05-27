# Outbound AI Calling Agent

## Purpose
Build a production-shaped hackathon MVP for an outbound AI calling agent for India-focused operations teams. The app imports Excel or CSV contact lists, starts automated outbound calling campaigns, records and tracks calls, classifies outcomes, supports Hindi-first live flows with English secondary support, and exports structured pickup or de-installation readiness results.

## MVP Workflow
1. Upload an Excel or CSV file with provider or pickup contact details.
2. Validate and deduplicate contacts.
3. Create a campaign with provider, language, retry, and calling settings.
4. Start bounded parallel outbound calls through a telephony provider adapter.
5. Ingest provider webhooks for status and recording events.
6. Classify call outcomes into operational dispositions.
7. Monitor original uploaded details plus enriched call results in a dashboard.
8. Export CSV rows that preserve uploaded details and add status, disposition, recording links, summary, next action, and retry information.

## Target Stack
- Next.js App Router with TypeScript.
- Tailwind CSS for UI.
- Supabase or PostgreSQL for persistence.
- Vercel for deployment, webhooks, and scheduled retry jobs.
- Plivo as the first provider adapter, with Twilio and Exotel adapters scaffolded.
- OpenAI Realtime for the Hindi-first voice agent, with `marin` as the default voice and `cedar` as fallback.
- OpenAI-powered helper functions for transcript summarization, disposition extraction, and language detection.
- Ultravox placeholders are kept as an optional managed voice-agent fallback, not the primary path.

## Setup
Run setup from the project root:

```sh
./scripts/setup.sh
```

No application stack has been installed yet. After the stack is scaffolded, update this section with exact commands.

## Development Commands
Current project entry points:

```sh
./scripts/setup.sh
./scripts/verify.sh
```

Expected commands after the Next.js stack is added:

```sh
npm run dev
npm run lint
npm run test
npm run build
```

## Testing
Testing should be added in layers:

- `tests/unit/`: validation, status mapping, language scripts, AI classification helpers.
- `tests/integration/`: upload parsing, campaign creation, provider webhook idempotency, retry scheduling.
- `tests/e2e/`: upload-to-dashboard demo workflow.

Run verification with:

```sh
./scripts/verify.sh
```

## Deployment Notes
- Deploy the Next.js app to Vercel.
- Use Supabase or managed PostgreSQL for the database.
- Configure provider webhooks to point at deployed API routes.
- Store real credentials only in local `.env` or Vercel environment variables.
- Keep `.env.example` limited to placeholder variable names.
- Add Vercel Cron routes for retry and provider status reconciliation.

## Key Docs
- `PRD.md`: Product requirements.
- `TASKS.md`: Phased implementation checklist.
- `docs/architecture.md`: System design and module boundaries.
- `docs/api.md`: API route contracts.
- `docs/implementation-plan.md`: Build sequence and score gates.
- `docs/decisions.md`: Architecture decision records.
