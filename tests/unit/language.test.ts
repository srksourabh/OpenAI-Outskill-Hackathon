import { describe, expect, it } from "vitest";
import { getEffectiveLanguage } from "@/domain/languages";

describe("getEffectiveLanguage", () => {
  it("falls back to Hindi when the row language is missing or unsupported", () => {
    expect(getEffectiveLanguage(undefined, "hi")).toBe("hi");
    expect(getEffectiveLanguage("xx", "hi")).toBe("hi");
  });

  it("uses supported row language over campaign default", () => {
    expect(getEffectiveLanguage("en", "hi")).toBe("en");
    expect(getEffectiveLanguage("ta", "hi")).toBe("ta");
  });
});
