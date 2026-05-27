import { describe, expect, it, vi } from "vitest";
import { analyzeTranscriptWithOpenAI } from "@/services/ai/openai";

describe("analyzeTranscriptWithOpenAI", () => {
  it("uses the OpenAI Responses API result when available", async () => {
    const fetchImpl: typeof fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            disposition: "confirmed_pickup",
            detected_language: "hi",
            summary_text: "Contact confirmed pickup readiness.",
            reason_code: null,
            confidence: 0.93
          })
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await analyzeTranscriptWithOpenAI("Haan, pickup ready hai.", {
      apiKey: "sk-test",
      model: "gpt-4.1-mini",
      fetchImpl
    });

    expect(result.disposition).toBe("confirmed_pickup");
    expect(result.next_action).toBe("send_engineer");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("falls back to the local classifier when the API key is missing", async () => {
    const fetchImpl: typeof fetch = vi.fn();

    const result = await analyzeTranscriptWithOpenAI("Haan, machine pickup ke liye ready hai.", {
      apiKey: "",
      fetchImpl
    });

    expect(result.disposition).toBe("confirmed_pickup");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("falls back to the local classifier when the OpenAI response is invalid", async () => {
    const fetchImpl: typeof fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ output_text: "not-json" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );

    const result = await analyzeTranscriptWithOpenAI("Maybe later, I am not sure.", {
      apiKey: "sk-test",
      model: "gpt-4.1-mini",
      fetchImpl
    });

    expect(result.disposition).toBe("manual_review");
    expect(result.next_action).toBe("verify_data");
  });
});
