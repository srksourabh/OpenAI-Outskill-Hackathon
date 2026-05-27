import type { Campaign } from "@/services/campaigns/types";

const resultColumns = [
  "call_status",
  "disposition",
  "next_action",
  "recording_url",
  "transcript_status",
  "summary",
  "reason_code",
  "detected_language",
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
      detected_language: call?.detected_language ?? contact.language_hint,
      attempt_number: call?.attempt_number ?? 0,
      last_call_time: call?.last_call_time ?? "",
      retry_eligible: call?.retry_eligible ?? false
    };
    lines.push(headers.map((header) => escapeCsv(row[header])).join(","));
  }

  return lines.join("\n");
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}
