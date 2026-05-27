export const voiceBridgePath = "/plivo/audio-stream";
export const voiceBridgeHealthPath = "/health";

export function getBridgeRequestInfo(url: string | undefined, host: string | undefined) {
  const parsed = new URL(url ?? "/", `http://${host ?? "localhost"}`);
  return {
    pathname: parsed.pathname,
    searchParams: parsed.searchParams
  };
}

export function isVoiceBridgeUpgradePath(pathname: string) {
  return pathname === voiceBridgePath;
}

export function isVoiceBridgeHealthPath(pathname: string) {
  return pathname === voiceBridgeHealthPath || pathname === "/";
}
