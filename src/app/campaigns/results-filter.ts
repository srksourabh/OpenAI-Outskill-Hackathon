export type ResultFilterRow = {
  language_hint?: unknown;
  call: {
    status: string;
    disposition: string;
    detected_language?: string;
    qa_score?: number;
    transcript_status?: string;
  } | null;
};

export type ResultFilters = {
  status: string;
  disposition: string;
  language: string;
  qa: string;
};

export function filterResultRows<T extends ResultFilterRow>(rows: T[], filters: ResultFilters): T[] {
  return rows.filter((row) => {
    const status = row.call?.status ?? "not_queued";
    const disposition = row.call?.disposition ?? "unknown";
    const language = row.call?.detected_language || String(row.language_hint ?? "");
    const qa = resolveQaBucket(row.call?.qa_score ?? null, row.call?.transcript_status ?? "missing");

    return (
      (filters.status === "all" || status === filters.status) &&
      (filters.disposition === "all" || disposition === filters.disposition) &&
      (filters.language === "all" || language === filters.language) &&
      (filters.qa === "all" || qa === filters.qa)
    );
  });
}

function resolveQaBucket(score: number | null, transcriptStatus: string) {
  if (score === null || transcriptStatus === "missing") return "none";
  if (score >= 75) return "pass";
  if (score >= 50) return "warn";
  return "fail";
}
