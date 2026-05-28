import { describe, expect, it } from "vitest";
import { formatDateTime } from "@/lib/date-time";

describe("formatDateTime", () => {
  it("returns a dash for missing values", () => {
    expect(formatDateTime(null)).toBe("-");
    expect(formatDateTime(undefined)).toBe("-");
    expect(formatDateTime("")).toBe("-");
  });

  it("returns the original value when parsing fails", () => {
    expect(formatDateTime("not a date")).toBe("not a date");
  });
});
