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
    detail: openAiConfigured ? "Configured." : "Not configured."
  });

  const plivoConfigured = Boolean(env.plivoAuthId && env.plivoAuthToken && env.plivoNumber);
  components.push({
    name: "Plivo provider",
    status: plivoConfigured ? "ok" : "warn",
    detail: plivoConfigured ? "Plivo credentials configured." : "Missing one or more Plivo credentials."
  });

  const voiceBridgeStatus = resolveVoiceBridgeStatus(env.voiceBridgePublicWsUrl);
  components.push({
    name: "Voice bridge",
    status: voiceBridgeStatus.status,
    detail: voiceBridgeStatus.detail
  });

  const apiKeyConfigured = Boolean(env.adminApiKey && !env.adminApiKey.startsWith("replace-with"));
  const sessionConfigured = Boolean(env.sessionSecret && env.sessionSecret.length >= 32 && !env.sessionSecret.startsWith("replace-with"));
  const credentialsConfigured = Boolean(env.authAdminEmail && env.authAdminPassword);
  components.push({
    name: "Admin authentication",
    status: apiKeyConfigured && sessionConfigured && credentialsConfigured ? "ok" : "warn",
    detail: apiKeyConfigured && sessionConfigured && credentialsConfigured ? "Configured." : "Incomplete production auth configuration."
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

function resolveVoiceBridgeStatus(value: string): HealthComponent {
  const normalized = value.trim();
  const isPlaceholder = normalized.includes("replace-with-voice-bridge-host") || normalized.includes("replace-with-render-service");

  if (isPlaceholder) {
    return {
      name: "Voice bridge",
      status: "warn",
      detail: "Missing public Render WebSocket URL. Expected format: wss://your-render-service.onrender.com/plivo/audio-stream."
    };
  }

  if (!normalized.startsWith("wss://")) {
    return {
      name: "Voice bridge",
      status: "warn",
      detail: "Voice bridge URL must use secure WebSocket format for live provider audio."
    };
  }

  if (!normalized.endsWith("/plivo/audio-stream")) {
    return {
      name: "Voice bridge",
      status: "warn",
      detail: "Voice bridge URL must point to the Plivo audio stream path."
    };
  }

  return {
    name: "Voice bridge",
    status: "ok",
    detail: "Configured for secure Plivo audio streaming."
  };
}
