import { describe, expect, it } from "vitest";
import { filterResultRows, type ResultFilterRow } from "@/app/campaigns/results-filter";

const rows: ResultFilterRow[] = [
  { language_hint: "hi", call: { status: "completed", disposition: "confirmed_pickup", detected_language: "hi" } },
  { language_hint: "en", call: { status: "not_picked", disposition: "not_picked", detected_language: "en" } },
  { language_hint: "ta", call: null }
];

describe("filterResultRows", () => {
  it("filters by call status, disposition, and language without hiding unqueued language matches", () => {
    expect(filterResultRows(rows, { status: "completed", disposition: "all", language: "all" })).toHaveLength(1);
    expect(filterResultRows(rows, { status: "all", disposition: "not_picked", language: "all" })).toHaveLength(1);
    expect(filterResultRows(rows, { status: "all", disposition: "all", language: "ta" })).toHaveLength(1);
  });
});
