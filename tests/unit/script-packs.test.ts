import { describe, expect, it } from "vitest";
import { scriptPacks } from "@/domain/script-packs";

describe("script packs", () => {
  it("includes a Hindi primary script pack and English secondary script pack", () => {
    expect(scriptPacks.hi.language).toBe("hi");
    expect(scriptPacks.hi.readinessQuestion).toContain("ready");
    expect(scriptPacks.en.language).toBe("en");
  });
});
