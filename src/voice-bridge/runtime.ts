type VoiceBridgeEnv = Record<string, string | undefined>;

export function resolveVoiceBridgePort(input: VoiceBridgeEnv) {
  const rawPort = input.PORT ?? input.VOICE_BRIDGE_PORT ?? "8080";
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid voice bridge port: ${rawPort}`);
  }
  return port;
}

export function resolveVoiceBridgeHost(input: VoiceBridgeEnv) {
  return input.VOICE_BRIDGE_HOST?.trim() || "0.0.0.0";
}
