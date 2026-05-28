export type ProviderName = "plivo" | "twilio" | "exotel";

export type ProviderCreateCallInput = {
  to: string;
  answerUrl: string;
  ringUrl?: string;
  hangupUrl?: string;
};

export type ProviderCreateCallResult = {
  provider_call_id: string | null;
  raw: unknown;
};

export type TelephonyProviderAdapter = {
  provider: ProviderName;
  createCall(input: ProviderCreateCallInput): Promise<ProviderCreateCallResult>;
};
