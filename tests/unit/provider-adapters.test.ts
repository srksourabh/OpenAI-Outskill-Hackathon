import { describe, expect, it } from "vitest";
import { exotelAdapter, plivoAdapter, twilioAdapter } from "@/services/providers";

describe("provider adapter skeletons", () => {
  it("exposes one adapter contract for Plivo, Twilio, and Exotel", () => {
    expect(plivoAdapter.provider).toBe("plivo");
    expect(twilioAdapter.provider).toBe("twilio");
    expect(exotelAdapter.provider).toBe("exotel");
    expect(typeof plivoAdapter.createCall).toBe("function");
    expect(typeof twilioAdapter.createCall).toBe("function");
    expect(typeof exotelAdapter.createCall).toBe("function");
  });
});
