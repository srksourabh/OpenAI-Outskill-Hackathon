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
- Vercel for the dashboard, API routes, provider webhooks, and scheduled retry jobs.
- Railway or an equivalent always-on container host for the long-lived Plivo AudioStream to OpenAI Realtime voice bridge.
- Plivo as the first provider adapter, with Twilio and Exotel adapters scaffolded.
- OpenAI Realtime for the Hindi-first voice agent, with `marin` as the default voice and `cedar` as fallback.
- OpenAI-powered helper functions for transcript summarization, disposition extraction, and language detection.
- Ultravox placeholders are kept as an optional managed voice-agent fallback, not the primary path.

## Setup
Run setup from the project root:

```sh
./scripts/setup.sh
```

On Windows PowerShell:

```powershell
.\scripts\setup.ps1
```

## Development Commands
Current project entry points:

```sh
./scripts/setup.sh
./scripts/verify.sh
```

Windows PowerShell:

```powershell
.\scripts\setup.ps1
.\scripts\verify.ps1
```

Node commands:

```sh
npm run dev
npm run lint
npm run test
npm run build
npm run voice:dev
```

Open the local app at `http://localhost:3000/campaigns`.

## Testing
Testing should be added in layers:

- `tests/unit/`: validation, status mapping, language scripts, AI classification helpers.
- `tests/integration/`: upload parsing, campaign creation, provider webhook idempotency, retry scheduling.
- `tests/e2e/`: upload-to-dashboard demo workflow.

Run verification with:

```sh
./scripts/verify.sh
```

On this Windows workspace, prefer:

```powershell
.\scripts\verify.ps1
```

The Bash script can fail under WSL if `node_modules` was installed for Windows because Rollup/Vitest optional native packages are platform-specific.

## Demo Data
Use [samples/demo-contacts.csv](samples/demo-contacts.csv) for the first upload demo. It contains 10 Hindi-first contacts, plus English and regional-language rows, and one unsupported language row that falls back to Hindi.

## Deployment Notes
- Deploy the Next.js dashboard and API to Vercel.
- Deploy the Node WebSocket voice bridge to Railway, Fly.io, Render, Cloud Run, or another always-on container service. Railway is the recommended MVP choice because it can run a persistent Node process for Plivo AudioStream.
- Use Supabase or managed PostgreSQL for the database.
- Configure Plivo answer/status/recording webhooks to point at the Vercel app.
- Configure Plivo AudioStream XML to point at the public Railway WebSocket URL from `VOICE_BRIDGE_PUBLIC_WS_URL`.
- Store real credentials only in local `.env` or Vercel environment variables.
- Store voice bridge secrets in the Railway service environment as well.
- Keep `.env.example` limited to placeholder variable names.
- Add Vercel Cron routes for retry and provider status reconciliation.
- Ship through preview deployments first, then promote one production Vercel deployment and one production Railway service after smoke tests pass.

## Key Docs
- `PRD.md`: Product requirements.
- `TASKS.md`: Phased implementation checklist.
- `docs/architecture.md`: System design and module boundaries.
- `docs/api.md`: API route contracts.
- `docs/implementation-plan.md`: Build sequence and score gates.
- `docs/decisions.md`: Architecture decision records.
