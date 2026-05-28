import { describe, expect, it } from "vitest";
import { filterResultRows, type ResultFilterRow } from "@/app/campaigns/results-filter";

const rows: ResultFilterRow[] = [
  { language_hint: "hi", call: { status: "completed", disposition: "confirmed_pickup", detected_language: "hi", qa_score: 88, transcript_status: "realtime" } },
  { language_hint: "en", call: { status: "not_picked", disposition: "not_picked", detected_language: "en", qa_score: 58, transcript_status: "simulated" } },
  { language_hint: "ta", call: null }
];

describe("filterResultRows", () => {
  it("filters by call status, disposition, and language without hiding unqueued language matches", () => {
    expect(filterResultRows(rows, { status: "completed", disposition: "all", language: "all", qa: "all" })).toHaveLength(1);
    expect(filterResultRows(rows, { status: "all", disposition: "not_picked", language: "all", qa: "all" })).toHaveLength(1);
    expect(filterResultRows(rows, { status: "all", disposition: "all", language: "ta", qa: "all" })).toHaveLength(1);
  });

  it("filters by QA verification bucket", () => {
    expect(filterResultRows(rows, { status: "all", disposition: "all", language: "all", qa: "pass" })).toHaveLength(1);
    expect(filterResultRows(rows, { status: "all", disposition: "all", language: "all", qa: "warn" })).toHaveLength(1);
    expect(filterResultRows(rows, { status: "all", disposition: "all", language: "all", qa: "none" })).toHaveLength(1);
  });
});
