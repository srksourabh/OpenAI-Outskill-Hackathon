import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { listCampaigns } from "@/services/campaigns/file-store";

type HealthLevel = "ok" | "warn" | "fail";

type HealthComponent = {
  name: string;
  status: HealthLevel;
  detail: string;
};

export async function GET() {
  const components: HealthComponent[] = [];
  let campaignCount = 0;
  let callCount = 0;

  try {
    const campaigns = await listCampaigns();
    campaignCount = campaigns.length;
    callCount = campaigns.reduce((total, campaign) => total + campaign.calls.length, 0);
    components.push({ name: "Campaign data store", status: "ok", detail: `${campaignCount} campaigns and ${callCount} calls available.` });
  } catch (error) {
    components.push({
      name: "Campaign data store",
      status: "fail",
      detail: error instanceof Error ? error.message : "Failed to read campaign store."
    });
  }

  const openAiConfigured = Boolean(env.openaiApiKey && !env.openaiApiKey.startsWith("replace-with"));
  components.push({
    name: "OpenAI API",
    status: openAiConfigured ? "ok" : "warn",
    detail: openAiConfigured ? "API key configured." : "Missing OPENAI_API_KEY, realtime and analysis routes will degrade."
  });

  const plivoConfigured = Boolean(env.plivoAuthId && env.plivoAuthToken && env.plivoNumber);
  components.push({
    name: "Plivo provider",
    status: plivoConfigured ? "ok" : "warn",
    detail: plivoConfigured ? "Plivo credentials configured." : "Missing one or more Plivo credentials."
  });

  const voiceBridgeConfigured = env.voiceBridgePublicWsUrl.includes("replace-with-voice-bridge-host") ? "warn" : "ok";
  components.push({
    name: "Voice bridge",
    status: voiceBridgeConfigured,
    detail:
      voiceBridgeConfigured === "ok"
        ? `Voice bridge endpoint set to ${env.voiceBridgePublicWsUrl}.`
        : "VOICE_BRIDGE_PUBLIC_WS_URL still uses placeholder value."
  });

  const authConfigured = Boolean(process.env.ADMIN_API_KEY && !process.env.ADMIN_API_KEY.startsWith("replace-with"));
  components.push({
    name: "Admin authentication",
    status: authConfigured ? "ok" : "warn",
    detail: authConfigured ? "ADMIN_API_KEY guard enabled for API access." : "Using test login session only; ADMIN_API_KEY is not configured."
  });

  const overallStatus: HealthLevel = components.some((item) => item.status === "fail")
    ? "fail"
    : components.some((item) => item.status === "warn")
      ? "warn"
      : "ok";

  return NextResponse.json({
    ok: overallStatus !== "fail",
    status: overallStatus,
    service: "edial",
    checked_at: new Date().toISOString(),
    metrics: {
      campaigns: campaignCount,
      calls: callCount
    },
    components
  });
}
