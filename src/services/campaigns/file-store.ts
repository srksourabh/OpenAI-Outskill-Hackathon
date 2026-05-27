import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Campaign } from "./types";

type Store = {
  campaigns: Campaign[];
};

const storePath = path.join(process.cwd(), ".data", "mvp-store.json");

export async function listCampaigns() {
  const store = await readStore();
  return store.campaigns.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getCampaign(id: string) {
  const store = await readStore();
  return store.campaigns.find((campaign) => campaign.id === id) ?? null;
}

export async function saveCampaign(campaign: Campaign) {
  const store = await readStore();
  const nextCampaigns = store.campaigns.filter((item) => item.id !== campaign.id);
  nextCampaigns.push(campaign);
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
