import { describe, expect, it } from "vitest";
import { isAuthorizedPlivoWebhook, mapPlivoHangup } from "@/services/plivo/webhooks";

describe("Plivo webhook helpers", () => {
  it("accepts matching shared-secret callbacks", () => {
    const url = new URL("https://app.example.com/api/plivo/hangup?callId=123&secret=abc");
    expect(isAuthorizedPlivoWebhook(url, "abc")).toBe(true);
    expect(isAuthorizedPlivoWebhook(url, "xyz")).toBe(false);
  });

  it("maps no-answer and busy outcomes to retryable states", () => {
    expect(mapPlivoHangup({ CallStatus: "no-answer" }).status).toBe("not_picked");
    expect(mapPlivoHangup({ CallStatus: "busy" }).status).toBe("not_connected");
  });

  it("maps invalid-number style failures to invalid_number", () => {
    const result = mapPlivoHangup({ CallStatus: "completed", HangupCause: "number does not exist" });

    expect(result.status).toBe("invalid_number");
    expect(result.disposition).toBe("invalid_number");
  });
});
