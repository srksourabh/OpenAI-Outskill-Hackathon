# Recording and Transcript Policy

The MVP treats phone numbers, recordings, transcripts, provider payloads, summaries, and exports as sensitive operational data.

## Access
- Dashboard and write APIs use the admin boundary configured by `ADMIN_API_KEY`.
- Cron routes require `CRON_SECRET`.
- Provider callbacks require `PLIVO_WEBHOOK_SECRET` when configured.
- Recording URLs should not be exposed outside the dashboard/export workflow.

## Retention
- Hackathon/demo storage keeps evidence only as long as the file-backed store or deployment runtime persists.
- Production should define a retention window before launch; the default recommendation is 30-90 days for call evidence unless legal requirements say otherwise.
- Deletion should remove transcripts, summaries, recording URLs, raw provider payloads, and exported files for the affected campaign or contact.

## Audit
- Provider webhook payloads are captured in `call_events`.
- Duplicate callback events are ignored for effective state transitions.
- Terminal call states are not moved back to active states by late provider callbacks.
