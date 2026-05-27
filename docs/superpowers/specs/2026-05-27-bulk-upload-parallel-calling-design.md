# Bulk Upload, Parallel Calling, and Enriched Export Design

## Status
Approved for planning from the current product direction.

## Problem
The product must remove manual calling work from operations teams that already manage contacts in spreadsheets. The input must be an Excel or CSV file containing a person's or provider's name, phone number, location, and other business details. After calls finish, the portal and CSV export must show the original uploaded details plus new result columns such as call status, recording links, disposition, summary, next action, and retry information.

The system must also run multiple calls at the same time. A one-by-one calling process would not solve the operational time problem.

## Design Options

### Option 1: Minimal Excel-only flow
Accept only `.xlsx`, store only known columns, and export only confirmed pickup rows.

Trade-off: fastest to build, but it loses extra business details and does not match operations teams that keep CSV files.

### Option 2: Flexible spreadsheet contract with bounded parallel dispatch
Accept `.xlsx` and `.csv`, normalize required canonical fields, preserve the full original row payload, show those fields in the portal, export original columns plus result columns, and dispatch calls up to a campaign concurrency limit.

Trade-off: slightly more implementation work, but it directly supports the requested workflow and keeps the architecture simple.

### Option 3: Full import mapping wizard and advanced scheduler
Let users map arbitrary column names, define custom result columns, and tune provider-specific call queues.

Trade-off: powerful, but too much surface area for the MVP.

## Recommendation
Use Option 2. It is the smallest complete design that supports Excel and CSV input, preserves all uploaded details, produces an operations-ready CSV output, displays the same information in the portal, and avoids slow manual calling through bounded parallel call dispatch.

## Upload Contract
Accepted formats:
- `.xlsx`
- `.csv`

Required canonical columns:
- `provider_name`
- `phone`
- `location`
- `machine_count`
- `order_id`

Optional known columns:
- `language_hint`
- `alternate_phone`
- `address`

Language defaults:
- Missing `language_hint` means Hindi (`hi`).
- Unsupported `language_hint` values fall back to Hindi and should be reported in import warnings.
- English (`en`) remains a supported secondary override.

Additional columns:
- Any extra uploaded business columns must be accepted and preserved.
- Examples: `zone`, `sales_owner`, `pickup_window`, `customer_type`, `remarks`.

Validation:
- Reject unsupported file types.
- Reject rows missing required fields.
- Normalize phone numbers before storing canonical `phone`.
- Validate `machine_count` as a positive integer.
- Deduplicate by `(campaign_id, phone, order_id)`.
- Store row-level validation errors for portal display.

## Stored Data
Contacts should store both normalized fields and original uploaded data.

Canonical fields:
- `provider_name`
- `phone`
- `location`
- `machine_count`
- `order_id`
- `language_hint`, defaulting to `hi` when missing or unsupported.
- `alternate_phone`
- `address`

Source preservation fields:
- `source_row_data jsonb`: original uploaded key-value pairs for the row.
- `source_file_name text`: uploaded file name.
- `source_file_type text`: `xlsx` or `csv`.
- `source_row_number integer`: original row number.
- `source_column_order text[]`: column order from the upload when practical.

Campaigns should store:
- `concurrency_limit integer not null default 5`.

Calls should store:
- `attempt_no integer not null default 1`.
- `recording_url text`.
- `transcript_text text`.
- `summary_text text`.
- `status text`.
- `disposition text`.
- `next_action text`.
- `reason_code text`.
- `detected_language text`.
- `confidence numeric`.
- `started_at timestamptz`.
- `ended_at timestamptz`.

## Parallel Calling
Campaigns must run calls in bounded parallel batches.

MVP rule:
- Default `concurrency_limit` is `5` active calls per campaign.

Dispatcher behavior:
- Starting a campaign creates one queued call row per valid contact.
- The dispatcher selects queued rows while active calls are below the concurrency limit.
- A call becomes active when the provider accepts the outbound call request.
- When an active call reaches a terminal state, the dispatcher can fill the freed slot.
- Failed provider creation should not consume a slot forever.
- Manual single-call mode can exist for debugging, but the main campaign path must use parallel dispatch.

Portal visibility:
- Show total contacts.
- Show queued calls.
- Show active calls.
- Show completed calls.
- Show failed calls.
- Show retry-eligible calls.
- Show current campaign concurrency limit.

## Portal Results
The campaign results table must display:
- Original uploaded columns from `source_row_data`.
- Canonical normalized fields.
- `call_status`.
- `disposition`.
- `next_action`.
- `recording_url` or recording availability.
- `transcript_status`.
- `summary_text`.
- `reason_code`.
- `detected_language`.
- `attempt_no`.
- `last_call_at`.
- `retry_eligible`.

The portal should let users filter by:
- Technical status.
- Business disposition.
- Language.
- Retry eligibility.

## CSV Export
The output must be a CSV file.

Column order:
1. Original uploaded columns, preferably in the same order as the source file.
2. Canonical normalized fields that are useful for auditing.
3. Result columns appended by the system.

Required result columns:
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

Export variants:
- All results.
- Confirmed pickup rows.
- Follow-up rows.
- Current filtered results.

Security:
- Do not export raw provider payloads.
- Do not export webhook signatures.
- Do not export secrets.
- Treat recording and transcript links as sensitive admin-only data.

## API Changes
Required route behavior:
- `POST /api/upload` accepts `.xlsx` and `.csv`.
- `POST /api/upload` returns accepted file type and preserved source columns.
- `POST /api/campaigns` accepts `concurrency_limit`.
- `POST /api/campaigns/:id/start` queues contacts and dispatches bounded parallel calls.
- `GET /api/campaigns/:id/results` returns original uploaded fields plus result fields.
- `GET /api/campaigns/:id/export` returns enriched CSV.

## Testing Strategy
Unit tests:
- CSV parsing.
- Excel parsing.
- Required-column validation.
- Original row preservation.
- Export column assembly.
- Retry eligibility.

Integration tests:
- Upload CSV creates contacts with `source_row_data`.
- Upload Excel creates contacts with `source_row_data`.
- Campaign start queues calls once.
- Dispatcher never exceeds `concurrency_limit`.
- Results API returns original and result columns.
- Export CSV contains uploaded details and appended result columns.

E2E demo test:
- Upload 10-row CSV or Excel sample.
- Start campaign with concurrency 5.
- Simulate at least 8 callbacks.
- Confirm portal shows original details and call outcomes.
- Export CSV and verify uploaded details plus result columns.

## Acceptance Criteria
- Admin can upload Excel or CSV files containing name, phone, location, and business details.
- Unsupported files are rejected.
- Original uploaded columns are preserved.
- Portal results show uploaded details and enriched call outcomes.
- Campaigns can run multiple simultaneous calls up to a configured limit.
- Exported CSV preserves uploaded columns and appends result columns.
- Export includes status, disposition, recording link, transcript status, summary, next action, attempt number, last call time, and retry eligibility.
- Manual one-by-one calling is not the primary campaign path.
