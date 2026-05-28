import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getAgentSettings, getPromptConfig } from "@/domain/voice-agent";
import { buildCallAgentSnapshot, buildStatusHistory } from "./engine";
import type { Campaign } from "./types";

type Store = {
  campaigns: Campaign[];
};

const storePath = resolveStorePath(process.env);

export function resolveStorePath(input: NodeJS.ProcessEnv) {
  if (input.MVP_STORE_DIR) {
    return path.join(input.MVP_STORE_DIR, "mvp-store.json");
  }

  if (input.VERCEL === "1") {
    return path.join(input.TMPDIR ?? os.tmpdir(), "outbound-ai-calling-agent", "mvp-store.json");
  }

  return path.join(process.cwd(), ".data", "mvp-store.json");
}

export async function listCampaigns() {
  const store = await readStore();
  return store.campaigns.map(normalizeCampaign).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getCampaign(id: string) {
  const store = await readStore();
  const campaign = store.campaigns.find((item) => item.id === id);
  return campaign ? normalizeCampaign(campaign) : null;
}

export async function saveCampaign(campaign: Campaign) {
  const store = await readStore();
  const nextCampaigns = store.campaigns.filter((item) => item.id !== campaign.id);
  nextCampaigns.push(normalizeCampaign(campaign));
  await writeStore({ campaigns: nextCampaigns });
  return campaign;
}

export async function updateCampaign(id: string, updater: (campaign: Campaign) => Campaign) {
  const campaign = await getCampaign(id);
  if (!campaign) return null;
  const updated = updater(campaign);
  await saveCampaign(updated);
  return updated;
}

async function readStore(): Promise<Store> {
  try {
    const raw = await readFile(storePath, "utf8");
    return JSON.parse(raw) as Store;
  } catch {
    return { campaigns: [] };
  }
}

async function writeStore(store: Store) {
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, JSON.stringify(store, null, 2));
}

function normalizeCampaign(campaign: Campaign): Campaign {
  const agentSettings = getAgentSettings(campaign.agent_settings);
  return {
    ...campaign,
    prompt_config: getPromptConfig(campaign.prompt_config),
    agent_settings: agentSettings,
    self_improvement_notes: campaign.self_improvement_notes ?? "",
    calls: campaign.calls.map((call) => ({
      ...call,
      ...("voice_preset_snapshot" in call
        ? {}
        : buildCallAgentSnapshot({
            agent_settings: agentSettings
          })),
      receiver_attitude: call.receiver_attitude ?? "unknown",
      improvement_note: call.improvement_note ?? "",
      status_history: call.status_history?.length ? call.status_history : buildStatusHistory(call.status, call.updated_at)
    }))
  };
}
