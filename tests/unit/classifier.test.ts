import { describe, expect, it } from "vitest";
import { classifyTranscript } from "@/services/ai/classifier";

describe("classifyTranscript", () => {
  it("maps affirmative pickup readiness to send engineer", () => {
    const result = classifyTranscript("Haan, machine pickup ke liye ready hai.");

    expect(result.disposition).toBe("confirmed_pickup");
    expect(result.next_action).toBe("send_engineer");
    expect(result.detected_language).toBe("hi");
  });

  it("routes unclear low-information transcript to manual review", () => {
    const result = classifyTranscript("Maybe later, I am not sure.");

    expect(result.disposition).toBe("manual_review");
    expect(result.next_action).toBe("verify_data");
  });
});
