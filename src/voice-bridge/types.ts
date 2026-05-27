export type PlivoStreamEvent =
  | { event: "start"; streamId?: string; start?: { callId?: string; callUuid?: string } }
  | { event: "media"; streamId?: string; media: { payload: string; timestamp?: string; track?: string } }
  | { event: "stop"; streamId?: string }
  | Record<string, unknown>;
