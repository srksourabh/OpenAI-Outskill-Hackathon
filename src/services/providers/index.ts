import { createPlivoCall, getProviderCallId } from "@/services/plivo/client";
import type { TelephonyProviderAdapter } from "./types";

export const plivoAdapter: TelephonyProviderAdapter = {
  provider: "plivo",
  async createCall(input) {
    if (!input.ringUrl || !input.hangupUrl) {
      throw new Error("Plivo calls require ringUrl and hangupUrl.");
    }

    const raw = await createPlivoCall({
      to: input.to,
      answerUrl: input.answerUrl,
      ringUrl: input.ringUrl,
      hangupUrl: input.hangupUrl
    });

    return {
      provider_call_id: getProviderCallId(raw),
      raw
    };
  }
};

export const twilioAdapter: TelephonyProviderAdapter = {
  provider: "twilio",
  async createCall() {
    throw new Error("Twilio adapter is scaffolded but not implemented for live calling yet.");
  }
};

export const exotelAdapter: TelephonyProviderAdapter = {
  provider: "exotel",
  async createCall() {
    throw new Error("Exotel adapter is scaffolded but not implemented for live calling yet.");
  }
};
