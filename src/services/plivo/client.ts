import * as plivo from "plivo";
import { env } from "@/config/env";

type CreatePlivoCallInput = {
  answerUrl: string;
  ringUrl: string;
  hangupUrl: string;
  to: string;
};

export async function createPlivoCall(input: CreatePlivoCallInput) {
  if (!env.plivoAuthId || !env.plivoAuthToken || !env.plivoNumber) {
    throw new Error("Plivo credentials are missing. Set PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN, and PLIVO_NUMBER.");
  }

  const client = new plivo.Client(env.plivoAuthId, env.plivoAuthToken);
  return client.calls.create(env.plivoNumber, input.to, input.answerUrl, {
    answerMethod: "GET",
    ringUrl: input.ringUrl,
    ringMethod: "POST",
    hangupUrl: input.hangupUrl,
    hangupMethod: "POST"
  });
}

export function getProviderCallId(result: unknown) {
  if (!result || typeof result !== "object") return null;

  const response = result as {
    apiId?: string;
    messageUuid?: string | string[];
    requestUuid?: string | string[];
  };

  if (typeof response.requestUuid === "string") return response.requestUuid;
  if (Array.isArray(response.requestUuid) && response.requestUuid[0]) return response.requestUuid[0];
  if (typeof response.messageUuid === "string") return response.messageUuid;
  if (Array.isArray(response.messageUuid) && response.messageUuid[0]) return response.messageUuid[0];
  if (typeof response.apiId === "string") return response.apiId;
  return null;
}
