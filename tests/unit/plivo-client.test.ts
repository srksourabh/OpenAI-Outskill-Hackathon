import { describe, expect, it } from "vitest";
import { getProviderCallId } from "@/services/plivo/client";

describe("getProviderCallId", () => {
  it("extracts the provider call id from string and array response shapes", () => {
    expect(getProviderCallId({ requestUuid: "call-123" })).toBe("call-123");
    expect(getProviderCallId({ requestUuid: ["call-456"] })).toBe("call-456");
    expect(getProviderCallId({ messageUuid: "call-789" })).toBe("call-789");
  });
});
