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
  const sourceColumns = Array.from(new Set(campaign.contacts.flatMap((contact) => Object.keys(contact.source_row_data))));
  const headers = [...sourceColumns, ...resultColumns];
  const lines = [headers.join(",")];

  for (const contact of campaign.contacts) {
    const call = campaign.calls.find((item) => item.contact_id === contact.id);
    const row: Record<string, string | number | boolean | null> = {
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
    lines.push(headers.map((header) => escapeCsv(row[header])).join(","));
  }

  return lines.join("\n");
}

export function buildResultsExcelTable(campaign: Campaign) {
  const sourceColumns = Array.from(new Set(campaign.contacts.flatMap((contact) => Object.keys(contact.source_row_data))));
  const headers = [...sourceColumns, ...resultColumns];
  const headerCells = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const rows = campaign.contacts
    .map((contact) => {
      const call = campaign.calls.find((item) => item.contact_id === contact.id);
      const row: Record<string, string | number | boolean | null> = {
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
      const cells = headers.map((header) => `<td>${escapeHtml(String(row[header] ?? ""))}</td>`).join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return [
    "<html><head><meta charset=\"UTF-8\"/></head><body>",
    `<table border="1"><thead><tr>${headerCells}</tr></thead><tbody>${rows}</tbody></table>`,
    "</body></html>"
  ].join("");
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
