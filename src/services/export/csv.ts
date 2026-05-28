import type { Campaign } from "@/services/campaigns/types";

const resultColumns = [
  "call_status",
  "disposition",
  "next_action",
  "recording_url",
  "transcript_status",
  "summary",
  "reason_code",
  "confidence",
  "detected_language",
  "callback_requested_at",
  "callback_remarks",
  "missed_call_note",
  "attempt_number",
  "last_call_time",
  "retry_eligible"
] as const;

export function buildResultsCsv(campaign: Campaign) {
  return Array.from(buildResultsCsvChunks(campaign)).join("\n");
}

export function* buildResultsCsvChunks(campaign: Campaign) {
  const headers = getHeaders(campaign);
  yield headers.join(",");

  for (const contact of campaign.contacts) {
    const row = buildResultRow(campaign, contact);
    yield headers.map((header) => escapeCsv(row[header])).join(",");
  }
}

export function buildResultsHtmlTable(campaign: Campaign) {
  return Array.from(buildResultsHtmlTableChunks(campaign)).join("");
}

export function* buildResultsHtmlTableChunks(campaign: Campaign) {
  const headers = getHeaders(campaign);
  const headerCells = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  yield `<html><head><meta charset="UTF-8"/></head><body><table border="1"><thead><tr>${headerCells}</tr></thead><tbody>`;

  for (const contact of campaign.contacts) {
    const row = buildResultRow(campaign, contact);
    const cells = headers.map((header) => `<td>${escapeHtml(String(row[header] ?? ""))}</td>`).join("");
    yield `<tr>${cells}</tr>`;
  }

  yield "</tbody></table></body></html>";
}

function getHeaders(campaign: Campaign) {
  const sourceColumns = Array.from(new Set(campaign.contacts.flatMap((contact) => Object.keys(contact.source_row_data))));
  return [...sourceColumns, ...resultColumns];
}

function buildResultRow(campaign: Campaign, contact: Campaign["contacts"][number]): Record<string, string | number | boolean | null> {
  const call = campaign.calls.find((item) => item.contact_id === contact.id);
  return {
    ...contact.source_row_data,
    call_status: call?.status ?? "not_queued",
    disposition: call?.disposition ?? "unknown",
    next_action: call?.next_action ?? "none",
    recording_url: call?.recording_url ?? "",
    transcript_status: call?.transcript_status ?? "missing",
    summary: call?.summary_text ?? "",
    reason_code: call?.reason_code ?? "",
    confidence: call?.confidence ?? 0,
    detected_language: call?.detected_language ?? contact.language_hint,
    callback_requested_at: call?.callback_requested_at ?? "",
    callback_remarks: call?.callback_remarks ?? "",
    missed_call_note: call?.missed_call_note ?? "",
    attempt_number: call?.attempt_number ?? 0,
    last_call_time: call?.last_call_time ?? "",
    retry_eligible: call?.retry_eligible ?? false
  };
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
