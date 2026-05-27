# API Documentation

## Authentication
The hackathon MVP can use a simple admin-only session model. Provider webhook endpoints must validate provider signatures or a shared secret where supported. Cron endpoints must require `Authorization: Bearer <CRON_SECRET>`.

## Idempotency
Webhook routes must be idempotent. Each provider event should derive an idempotency key from:

- Provider name.
- Provider call ID.
- Event type.
- Provider event timestamp, recording ID, or status sequence ID when available.

Handlers should write the raw event and apply call state changes in one database transaction. Duplicate events should return success without repeating state transitions.

## Webhook Auth Rules
- Plivo: validate Plivo signature when configured; otherwise require an internal shared webhook secret for demo mode.
- Twilio: validate Twilio request signature when configured; otherwise keep routes scaffolded and disabled.
- Exotel: validate the supported callback secret or configured shared secret before processing.
- Simulated callbacks: require admin auth or a demo-only secret and must be disabled in production.

## `POST /api/upload`
Uploads an Excel or CSV file, creates a campaign, parses contacts, validates rows, preserves original uploaded row details, and skips duplicates.

Request:
- Content-Type: `multipart/form-data`
- Fields:
  - `file`: `.xlsx` or `.csv` file.
  - `company_name`: string.
  - `provider`: `plivo`, `twilio`, or `exotel`.
  - `default_language`: optional language code, default `hi`.
  - `retry_limit`: optional integer.
  - `concurrency_limit`: optional integer, default `5`.

Required file columns:
- `provider_name`
- `phone`
- `location`
- `machine_count`
- `order_id`

Optional file columns:
- `language_hint`, defaulting to Hindi (`hi`) when missing or unsupported.
- `alternate_phone`
- `address`
- Any additional business columns, which must be preserved as original row data.

Response `200`:
```json
{
  "campaign_id": "uuid",
  "imported": 120,
  "duplicates_skipped": 4,
  "invalid_rows": 3,
  "accepted_file_type": "csv",
  "preserved_source_columns": [
    "provider_name",
    "phone",
    "location",
    "machine_count",
    "order_id",
    "zone",
    "sales_owner"
  ]
}
```

## `POST /api/campaigns`
Creates a campaign without upload.

Request:
```json
{
  "name": "May pickup batch",
  "company_name": "Acme Logistics",
  "provider": "plivo",
  "default_language": "hi",
  "retry_limit": 2,
  "concurrency_limit": 5
}
```

Response `201`:
```json
{
  "id": "uuid",
  "status": "draft"
}
```

## `POST /api/campaigns/:id/start`
Starts a draft campaign and queues outbound calls.

Response `200`:
```json
{
  "campaign_id": "uuid",
  "status": "running",
  "queued_calls": 120,
  "concurrency_limit": 5,
  "dispatch_mode": "bounded_parallel"
}
```

Behavior:
- Queue one initial call row per valid contact.
- Dispatch only up to the campaign `concurrency_limit` at once.
- Refill available call slots as active calls complete or fail.
- Do not duplicate queued calls when the endpoint is retried.
- Use campaign `default_language`, defaulting to Hindi (`hi`), unless a supported contact `language_hint` overrides it.

## `GET /api/campaigns/:id`
Returns campaign summary and aggregate stats.

Response `200`:
```json
{
  "id": "uuid",
  "name": "May pickup batch",
  "provider": "plivo",
  "status": "running",
  "stats": {
    "total": 120,
    "queued": 80,
    "ringing": 5,
    "answered": 12,
    "not_picked": 10,
    "not_connected": 8,
    "invalid_number": 2,
    "confirmed_pickup": 6,
    "declined": 4,
    "follow_up_needed": 2
  }
}
```

## `GET /api/campaigns/:id/results`
Returns paginated call results.

Query params:
- `page`
- `limit`
- `status`
- `disposition`
- `language`

Response `200`:
```json
{
  "items": [
    {
      "call_id": "uuid",
      "provider_name": "Vendor A",
      "phone": "+919999999999",
      "location": "Howrah Warehouse",
      "source_row_data": {
        "provider_name": "Vendor A",
        "phone": "+919999999999",
        "location": "Howrah Warehouse",
        "machine_count": "3",
        "order_id": "ORD-1001",
        "zone": "East",
        "sales_owner": "Priya"
      },
      "status": "completed",
      "disposition": "confirmed_pickup",
      "detected_language": "hi",
      "recording_url": "https://example.com/recording.wav",
      "recording_status": "available",
      "summary_text": "Customer confirmed pickup readiness for 3 machines.",
      "next_action": "send_engineer",
      "attempt_no": 1,
      "retry_eligible": false
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 120
}
```

## `GET /api/campaigns/:id/export`
Exports campaign results as CSV.

Query params:
- `disposition`: optional disposition filter.
- `status`: optional technical status filter.
- `include_all_results`: optional boolean, default `true`.

Response `200`:
- Content-Type: `text/csv`
- Filename: `campaign-<id>-results.csv`

CSV column rules:
- Include every original uploaded column from `source_row_data` first, in upload order when known.
- Append canonical normalized fields when they differ from uploaded values.
- Append result columns:
  - `call_status`
  - `disposition`
  - `next_action`
  - `recording_url`
  - `recording_status`
  - `transcript_status`
  - `summary_text`
  - `reason_code`
  - `detected_language`
  - `attempt_no`
  - `last_call_at`
  - `retry_eligible`
- Exclude raw provider payloads, secrets, webhook signatures, and internal audit metadata.

## `POST /api/calls/:id/retry`
Retries a failed, not-picked, or not-connected call if retry limit allows it.

Response `200`:
```json
{
  "call_id": "uuid",
  "new_attempt_no": 2,
  "status": "queued"
}
```

## `POST /api/webhooks/plivo/answer`
Returns provider-specific voice XML or response body for greeting, prompts, and recording setup.

Behavior:
- Resolve campaign and contact context.
- Select language script.
- Start in Hindi by default. Use English only when the configured language is `en` or the caller clearly requests English. Use other Indian language packs only when configured; otherwise fall back to Hindi and mark the mismatch for review.
- Build voice response.
- Append a `call_events` row.
- Require provider signature or configured webhook secret.

## `POST /api/webhooks/plivo/hangup`
Consumes Plivo final call status.

Behavior:
- Resolve call by provider call ID.
- Map provider status into internal status.
- Update duration and end time.
- Append raw payload to `call_events`.
- Trigger classification when transcript evidence is available.
- Ignore stale transitions for terminal calls.

## `POST /api/webhooks/plivo/recording`
Stores recording metadata and URL.

## `POST /api/webhooks/simulated/call-event`
Demo-only route for deterministic hackathon callbacks.

Request:
```json
{
  "call_id": "uuid",
  "status": "completed",
  "transcript_text": "Yes, three machines are ready for pickup tomorrow.",
  "recording_url": "https://example.com/demo-recording.wav",
  "detected_language": "en"
}
```

Behavior:
- Require admin auth or demo callback secret.
- Append a `call_events` row.
- Apply valid state transition.
- Run classification from `transcript_text`.
- Mark transcript source as `simulated`.

## `POST /api/webhooks/twilio/status`
Consumes Twilio call progress callbacks and maps them into internal call statuses.

## `POST /api/webhooks/twilio/recording`
Consumes Twilio recording status callbacks and stores recording metadata.

## `POST /api/webhooks/exotel/call-status`
Consumes Exotel callback payloads and maps them into internal call statuses.

## `GET /api/cron/retry-unanswered`
Retries eligible calls marked `not_picked` or `not_connected`.

Headers:
- `Authorization: Bearer <CRON_SECRET>`

## `GET /api/cron/reconcile-provider-status`
Reconciles calls stuck in non-terminal states by querying the selected provider.

Headers:
- `Authorization: Bearer <CRON_SECRET>`

## Shared Enums

### Campaign Status
- `draft`
- `running`
- `paused`
- `completed`
- `failed`

### Call Status
- `queued`
- `initiated`
- `ringing`
- `answered`
- `completed`
- `failed`
- `not_picked`
- `not_connected`
- `invalid_number`
- `voicemail`

### Call Disposition
- `unknown`
- `confirmed_pickup`
- `declined`
- `follow_up_needed`
- `manual_review`
- `voicemail`

### Next Action
- `none`
- `retry`
- `send_engineer`
- `manual_followup`
- `verify_data`

## AI Classification Contract
Input transcript or recognized text should produce structured JSON:

```json
{
  "detected_language": "hi",
  "pickup_confirmed": true,
  "disposition": "confirmed_pickup",
  "reason_code": null,
  "summary_text": "Customer confirmed three machines are ready for pickup tomorrow morning.",
  "next_action": "send_engineer",
  "confidence": 0.91
}
```

Low-confidence results must be stored as `manual_review`.
