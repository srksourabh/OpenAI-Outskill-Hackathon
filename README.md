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
- OpenAI Responses API for transcript summarization, disposition extraction, and language detection, with a local rule-based fallback when API analysis is unavailable.
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

## Live Calling Prerequisites
For a real Plivo outbound call, the app now requires all of the following before `Start campaign` will dial:

- `provider=plivo` on the created campaign.
- `APP_BASE_URL` must be a public URL that Plivo can reach, not `localhost`.
- `VOICE_BRIDGE_PUBLIC_WS_URL` must point to the public `wss://` voice bridge endpoint.
- `OPENAI_API_KEY` must be set for the voice bridge runtime.
- `OPENAI_RESPONSES_MODEL` controls the text model used for transcript analysis. The checked-in default is `gpt-4.1-mini`.
- `PLIVO_AUTH_ID`, `PLIVO_AUTH_TOKEN`, and `PLIVO_NUMBER` must be set.

If any of these are missing, the dashboard now returns a clear error instead of pretending the live call started.

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

For quick testing in the app:
- Download `/sample-mobile-upload.csv` from the dashboard for a lightweight mobile-number template.
- Uploads can now use common phone headers such as `phone`, `mobile`, `mobile_number`, `phone_number`, or `contact_number`.
- The dashboard also includes a one-number quick-check form that creates a single-contact test campaign without a spreadsheet.

## Deployment Notes
- Deploy the Next.js dashboard and API to Vercel.
- Deploy the Node WebSocket voice bridge to Render, Fly.io, Railway, Cloud Run, or another always-on container service. Render is the current recommended MVP choice for this repo because it can run a persistent Node process for Plivo AudioStream and expose a simple health check.
- Use Supabase or managed PostgreSQL for the database.
- Configure Plivo answer/status/recording webhooks to point at the Vercel app.
- Configure Plivo AudioStream XML to point at the public Render WebSocket URL from `VOICE_BRIDGE_PUBLIC_WS_URL`.
- The voice bridge serves HTTP health checks on `/health` and accepts WebSocket upgrades on `/plivo/audio-stream`.
- Store real credentials only in local `.env` or Vercel environment variables.
- The demo JSON file store now writes to a temp directory on Vercel instead of `/var/task/.data`, so serverless uploads can persist during a runtime instance without hitting the read-only filesystem.
- Store voice bridge secrets in the Render service environment as well.
- Keep `.env.example` limited to placeholder variable names.
- Add Vercel Cron routes for retry and provider status reconciliation.
- The checked-in `vercel.json` currently uses once-daily cron schedules so Hobby deployments succeed. Upgrade to Vercel Pro and restore the higher-frequency retry cadence when you need `*/10` and `*/15` production jobs.
- Ship through preview deployments first, then promote one production Vercel deployment and one production Render service after smoke tests pass.

## Key Docs
- `PRD.md`: Product requirements.
- `TASKS.md`: Phased implementation checklist.
- `docs/architecture.md`: System design and module boundaries.
- `docs/api.md`: API route contracts.
- `docs/implementation-plan.md`: Build sequence and score gates.
- `docs/decisions.md`: Architecture decision records.
