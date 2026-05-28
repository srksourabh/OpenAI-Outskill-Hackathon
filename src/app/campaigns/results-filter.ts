export type ResultFilterRow = {
  language_hint?: unknown;
  call: {
    status: string;
    disposition: string;
    detected_language?: string;
  } | null;
};

export type ResultFilters = {
  status: string;
  disposition: string;
  language: string;
};

export function filterResultRows<T extends ResultFilterRow>(rows: T[], filters: ResultFilters): T[] {
  return rows.filter((row) => {
    const status = row.call?.status ?? "not_queued";
    const disposition = row.call?.disposition ?? "unknown";
    const language = row.call?.detected_language || String(row.language_hint ?? "");

    return (
      (filters.status === "all" || status === filters.status) &&
      (filters.disposition === "all" || disposition === filters.disposition) &&
      (filters.language === "all" || language === filters.language)
    );
  });
}
