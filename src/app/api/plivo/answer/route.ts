import { env } from "@/config/env";
import { buildPlivoStreamXml } from "@/services/plivo/xml";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const callId = url.searchParams.get("callId");
  if (!callId) return new Response("Missing callId", { status: 400 });

  const wsUrl = new URL(env.voiceBridgePublicWsUrl);
  wsUrl.searchParams.set("callId", callId);
  const xml = buildPlivoStreamXml({
    wsUrl: wsUrl.toString(),
    statusCallbackUrl: `${env.appBaseUrl}/api/plivo/stream-status`
  });

  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
}
