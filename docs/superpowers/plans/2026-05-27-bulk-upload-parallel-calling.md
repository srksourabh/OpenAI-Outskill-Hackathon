# Bulk Upload, Parallel Calling, and Enriched Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Excel/CSV campaign input, bounded parallel outbound calling, portal result visibility, and enriched CSV export that preserves uploaded details and appends call-result columns.

**Architecture:** Keep ingestion, campaign orchestration, dispatching, dashboard queries, and export generation as separate service boundaries. Store normalized contact fields for business logic and preserve the original uploaded row payload for portal display and CSV export. Dispatch calls through a bounded campaign queue so multiple calls run simultaneously without exceeding provider limits.

**Tech Stack:** Next.js App Router, TypeScript, Supabase/PostgreSQL, server-side spreadsheet parsing, provider adapter interface, Vitest integration tests, CSV export from server route.

---

## Scope Check
This plan covers one cohesive workflow: spreadsheet upload to parallel calling to portal results to CSV export. It does not implement advanced CRM integrations, custom column-mapping UI, provider-specific rate-limit tuning, or production retention automation.

## File Structure

- Modify: `package.json` - add the spreadsheet parser dependency only after running `kluster_dependency_check`.
- Modify: `db/schema.sql` or migrations - add source row preservation and campaign concurrency fields.
- Create: `src/domain/uploads.ts` - upload column constants, accepted file types, and row validation helpers.
- Create: `src/domain/exports.ts` - result column definitions and export row assembly.
- Create: `src/services/ingestion/parse-upload.ts` - parse `.xlsx` and `.csv` files into raw rows.
- Create: `src/services/ingestion/validate-contact-row.ts` - normalize canonical fields and preserve original row data.
- Create: `src/services/ingestion/import-contacts.ts` - create contacts and import summary.
- Modify: `src/services/campaigns/repository.ts` - store `concurrency_limit` and source column metadata.
- Create: `src/services/calls/dispatch.ts` - bounded parallel call dispatch.
- Modify: `src/services/calls/repository.ts` - query active call counts, queued calls, and attempt numbers.
- Create: `src/services/exports/campaign-results-csv.ts` - build CSV output.
- Modify: `src/app/api/upload/route.ts` - accept Excel and CSV and return preserved source columns.
- Modify: `src/app/api/campaigns/route.ts` - accept `concurrency_limit`.
- Modify: `src/app/api/campaigns/[id]/start/route.ts` - queue and dispatch calls.
- Modify: `src/app/api/campaigns/[id]/results/route.ts` - include original row details and enriched result fields.
- Create: `src/app/api/campaigns/[id]/export/route.ts` - return enriched CSV.
- Modify: `src/app/campaigns/[id]/page.tsx` - display source details and result columns.
- Create: `samples/contacts-template.csv` - 10-row demo CSV.
- Create: `samples/contacts-template.xlsx` - 10-row demo Excel template if the project tooling supports binary fixtures.
- Test: `tests/unit/upload-validation.test.ts`.
- Test: `tests/unit/export-columns.test.ts`.
- Test: `tests/integration/upload-csv.test.ts`.
- Test: `tests/integration/upload-xlsx.test.ts`.
- Test: `tests/integration/parallel-dispatch.test.ts`.
- Test: `tests/integration/export-results.test.ts`.

## Task 1: Add Data Shape for Source Rows and Concurrency

**Files:**
- Modify: `db/schema.sql` or create the next migration file.
- Modify: `src/services/campaigns/repository.ts`
- Modify: `src/services/calls/repository.ts`
- Test: `tests/integration/parallel-dispatch.test.ts`

- [ ] **Step 1: Write migration expectations**

The schema must include these fields:

```sql
alter table campaigns
  add column if not exists concurrency_limit integer not null default 5;

alter table contacts
  add column if not exists source_row_data jsonb not null default '{}'::jsonb,
  add column if not exists source_file_name text,
  add column if not exists source_file_type text,
  add column if not exists source_row_number integer,
  add column if not exists source_column_order text[] not null default '{}';

alter table calls
  add column if not exists attempt_no integer not null default 1;

create index if not exists calls_campaign_status_idx on calls(campaign_id, status);
```

- [ ] **Step 2: Add repository contract**

Expose repository functions with these signatures:

```ts
export type CampaignConcurrency = {
  campaignId: string;
  concurrencyLimit: number;
  activeCallCount: number;
};

export async function getCampaignConcurrency(campaignId: string): Promise<CampaignConcurrency>;

export async function getQueuedCallsForDispatch(input: {
  campaignId: string;
  limit: number;
}): Promise<Array<{ callId: string; contactId: string; phone: string }>>;
```

- [ ] **Step 3: Verify**

Run:

```powershell
npm run test -- tests/integration/parallel-dispatch.test.ts
```

Expected: the test can create a campaign with `concurrency_limit` and query active versus queued calls.

## Task 2: Implement Upload Parsing for Excel and CSV

**Files:**
- Modify: `package.json`
- Create: `src/domain/uploads.ts`
- Create: `src/services/ingestion/parse-upload.ts`
- Test: `tests/unit/upload-validation.test.ts`

- [ ] **Step 1: Validate dependency before package change**

Run `kluster_dependency_check` before editing `package.json` or installing a spreadsheet parser. The recommended dependency is one parser that supports `.xlsx` and `.csv` so the ingestion logic has a single code path.

- [ ] **Step 2: Define upload constants**

Create `src/domain/uploads.ts`:

```ts
export const acceptedUploadFileTypes = ["xlsx", "csv"] as const;

export const requiredContactColumns = [
  "provider_name",
  "phone",
  "location",
  "machine_count",
  "order_id"
] as const;

export type AcceptedUploadFileType = (typeof acceptedUploadFileTypes)[number];
export type RequiredContactColumn = (typeof requiredContactColumns)[number];

export type RawUploadRow = {
  rowNumber: number;
  values: Record<string, string>;
  columnOrder: string[];
};
```

- [ ] **Step 3: Parse file into raw rows**

Implement `parseUploadFile`:

```ts
import * as XLSX from "xlsx";
import type { RawUploadRow } from "@/domain/uploads";

export type ParsedUpload = {
  fileType: "xlsx" | "csv";
  columnOrder: string[];
  rows: RawUploadRow[];
};

export async function parseUploadFile(input: {
  fileName: string;
  fileBuffer: Buffer;
}): Promise<ParsedUpload> {
  const extension = input.fileName.toLowerCase().split(".").pop();
  if (extension !== "xlsx" && extension !== "csv") {
    throw new Error("Unsupported upload file type");
  }

  const workbook = XLSX.read(input.fileBuffer, {
    type: "buffer",
    raw: false,
    cellDates: false
  });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("Upload file has no sheets or rows");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const matrix = XLSX.utils.sheet_to_json<Array<string | number | boolean | null>>(sheet, {
    header: 1,
    defval: "",
    blankrows: false
  });

  const headers = (matrix[0] ?? []).map((value) => String(value).trim()).filter(Boolean);
  const rows = matrix.slice(1).map((cells, index) => {
    const values: Record<string, string> = {};
    headers.forEach((header, cellIndex) => {
      values[header] = String(cells[cellIndex] ?? "").trim();
    });

    return {
      rowNumber: index + 2,
      values,
      columnOrder: headers
    };
  });

  return {
    fileType: extension,
    columnOrder: headers,
    rows
  };
}
```

- [ ] **Step 4: Verify validation behavior**

Run:

```powershell
npm run test -- tests/unit/upload-validation.test.ts
```

Expected: unsupported files fail; `.xlsx` and `.csv` fixtures parse to raw rows with column order.

## Task 3: Validate Rows and Preserve Original Uploaded Details

**Files:**
- Create: `src/services/ingestion/validate-contact-row.ts`
- Create: `src/services/ingestion/import-contacts.ts`
- Test: `tests/integration/upload-csv.test.ts`
- Test: `tests/integration/upload-xlsx.test.ts`

- [ ] **Step 1: Implement normalized contact output**

Use this type:

```ts
export type ValidImportedContact = {
  providerName: string;
  phone: string;
  location: string;
  machineCount: number;
  orderId: string;
  languageHint: string | null;
  alternatePhone: string | null;
  address: string | null;
  sourceRowData: Record<string, string>;
  sourceRowNumber: number;
  sourceColumnOrder: string[];
};
```

- [ ] **Step 2: Validate required columns and fields**

Rules:
- Missing required column means the whole file is invalid.
- Missing required value means that row is invalid.
- `machine_count` must parse to a positive integer.
- `phone` must normalize to the project phone format.
- Missing or unsupported `language_hint` must become `hi`.
- Extra columns remain in `sourceRowData`.

- [ ] **Step 3: Store contacts**

Insert canonical fields and source preservation fields together:

```ts
await insertContact({
  campaignId,
  providerName: row.providerName,
  phone: row.phone,
  location: row.location,
  machineCount: row.machineCount,
  orderId: row.orderId,
  languageHint: row.languageHint,
  alternatePhone: row.alternatePhone,
  address: row.address,
  sourceRowData: row.sourceRowData,
  sourceFileName,
  sourceFileType,
  sourceRowNumber: row.sourceRowNumber,
  sourceColumnOrder: row.sourceColumnOrder
});
```

- [ ] **Step 4: Verify**

Run:

```powershell
npm run test -- tests/integration/upload-csv.test.ts tests/integration/upload-xlsx.test.ts
```

Expected: both file types create contacts with canonical fields and preserved original columns.

## Task 4: Add Bounded Parallel Dispatch

**Files:**
- Create: `src/services/calls/dispatch.ts`
- Modify: `src/app/api/campaigns/[id]/start/route.ts`
- Test: `tests/integration/parallel-dispatch.test.ts`

- [ ] **Step 1: Implement dispatcher contract**

```ts
export type DispatchResult = {
  campaignId: string;
  concurrencyLimit: number;
  activeBeforeDispatch: number;
  dispatched: number;
  remainingQueued: number;
};

export async function dispatchCampaignCalls(campaignId: string): Promise<DispatchResult> {
  const concurrency = await getCampaignConcurrency(campaignId);
  const availableSlots = Math.max(0, concurrency.concurrencyLimit - concurrency.activeCallCount);

  if (availableSlots === 0) {
    return {
      campaignId,
      concurrencyLimit: concurrency.concurrencyLimit,
      activeBeforeDispatch: concurrency.activeCallCount,
      dispatched: 0,
      remainingQueued: await countQueuedCalls(campaignId)
    };
  }

  const queuedCalls = await getQueuedCallsForDispatch({ campaignId, limit: availableSlots });
  for (const call of queuedCalls) {
    await startProviderCall(call);
  }

  return {
    campaignId,
    concurrencyLimit: concurrency.concurrencyLimit,
    activeBeforeDispatch: concurrency.activeCallCount,
    dispatched: queuedCalls.length,
    remainingQueued: await countQueuedCalls(campaignId)
  };
}
```

- [ ] **Step 2: Call dispatcher after campaign start**

`POST /api/campaigns/:id/start` should:
- Create queued call rows once.
- Set campaign status to `running`.
- Invoke `dispatchCampaignCalls`.
- Return dispatch metadata.

- [ ] **Step 3: Refill slots after terminal callbacks**

After a webhook marks a call terminal, invoke the dispatcher for the campaign. This keeps the campaign moving without waiting for a separate manual action.

- [ ] **Step 4: Verify**

Run:

```powershell
npm run test -- tests/integration/parallel-dispatch.test.ts
```

Expected: with 10 queued calls and concurrency 5, exactly 5 calls are dispatched first; after 2 terminal updates, exactly 2 more calls are dispatched.

## Task 5: Return Original and Result Fields in Portal APIs

**Files:**
- Modify: `src/app/api/campaigns/[id]/results/route.ts`
- Modify: `src/app/campaigns/[id]/page.tsx`
- Test: `tests/integration/campaign-results.test.ts`

- [ ] **Step 1: Extend results DTO**

```ts
export type CampaignResultRow = {
  callId: string;
  contactId: string;
  sourceRowData: Record<string, string>;
  sourceColumnOrder: string[];
  providerName: string;
  phone: string;
  location: string;
  machineCount: number;
  orderId: string;
  callStatus: string;
  disposition: string;
  nextAction: string;
  recordingUrl: string | null;
  transcriptStatus: "missing" | "available";
  summaryText: string | null;
  reasonCode: string | null;
  detectedLanguage: string | null;
  attemptNo: number;
  lastCallAt: string | null;
  retryEligible: boolean;
};
```

- [ ] **Step 2: Update dashboard table**

Show source columns first, then operational result columns. Keep the table horizontally scrollable on small screens because uploaded business sheets can have many columns.

- [ ] **Step 3: Verify**

Run:

```powershell
npm run test -- tests/integration/campaign-results.test.ts
```

Expected: API response includes uploaded source data and result fields for every row.

## Task 6: Build Enriched CSV Export

**Files:**
- Create: `src/domain/exports.ts`
- Create: `src/services/exports/campaign-results-csv.ts`
- Create: `src/app/api/campaigns/[id]/export/route.ts`
- Test: `tests/unit/export-columns.test.ts`
- Test: `tests/integration/export-results.test.ts`

- [ ] **Step 1: Define appended result columns**

```ts
export const appendedResultColumns = [
  "call_status",
  "disposition",
  "next_action",
  "recording_url",
  "recording_status",
  "transcript_status",
  "summary_text",
  "reason_code",
  "detected_language",
  "attempt_no",
  "last_call_at",
  "retry_eligible"
] as const;
```

- [ ] **Step 2: Build export rows**

For each campaign result:
- Start with `sourceRowData` in original column order.
- Add normalized fields if needed for auditing.
- Append `appendedResultColumns`.
- Escape CSV cells according to CSV rules.

- [ ] **Step 3: Add export route**

`GET /api/campaigns/:id/export` should return:

```ts
return new Response(csvBody, {
  headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="campaign-${campaignId}-results.csv"`
  }
});
```

- [ ] **Step 4: Verify**

Run:

```powershell
npm run test -- tests/unit/export-columns.test.ts tests/integration/export-results.test.ts
```

Expected: CSV contains original uploaded columns and appended result columns, and excludes raw provider payloads.

## Task 7: Add Demo Fixtures and E2E Coverage

**Files:**
- Create: `samples/contacts-template.csv`
- Create: `samples/contacts-template.xlsx`
- Test: `tests/e2e/upload-to-export.test.ts`
- Modify: `TASKS.md`

- [ ] **Step 1: Add 10-row sample CSV**

The CSV must include:
- `provider_name`
- `phone`
- `location`
- `machine_count`
- `order_id`
- `language_hint`
- At least two extra business columns such as `zone` and `sales_owner`.

Use `language_hint=hi` for most rows. Include a small number of `en`, `bn`, and `ta` rows to prove supported overrides and regional-language configuration.

- [ ] **Step 2: Add Excel sample**

Create the same columns and rows as the CSV template.

- [ ] **Step 3: Add E2E test**

The test should:
- Upload the sample file.
- Create a campaign.
- Start the campaign with concurrency 5.
- Simulate at least 8 callbacks.
- Open results.
- Export CSV.
- Assert the exported CSV includes uploaded fields and appended result fields.

- [ ] **Step 4: Update task tracking**

Mark the relevant upload, parallel dispatch, portal, and export tasks in `TASKS.md` only after the implementation and verification pass.

## Plan Self-Review
Spec coverage:
- Excel and CSV input: Tasks 2 and 3.
- Original row preservation: Tasks 1, 3, 5, and 6.
- Portal visibility: Task 5.
- Parallel calls: Task 4.
- Enriched CSV output: Task 6.
- Demo proof: Task 7.

Placeholder scan:
- The plan avoids deferred placeholders and provides concrete contracts, code shapes, commands, and expected outcomes.

Type consistency:
- `sourceRowData`, `sourceColumnOrder`, `concurrencyLimit`, `attemptNo`, and `retryEligible` are consistently named across DTOs and services.

## Execution Handoff
Plan complete and saved to `docs/superpowers/plans/2026-05-27-bulk-upload-parallel-calling.md`.

Two execution options:

1. **Subagent-Driven (recommended)** - dispatch a fresh subagent per task and review between tasks.
2. **Inline Execution** - execute tasks in this session using executing-plans, with checkpoints for review.
