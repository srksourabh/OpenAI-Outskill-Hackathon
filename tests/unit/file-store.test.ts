import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getCampaign, listCampaigns, resolveStorePath, saveCampaign } from "@/services/campaigns/file-store";
import { createCampaignFromContacts } from "@/services/campaigns/engine";

describe("resolveStorePath", () => {
  it("keeps local development storage in the workspace by default", () => {
    const storePath = resolveStorePath({} as NodeJS.ProcessEnv);

    expect(storePath).toBe(path.join(process.cwd(), ".data", "mvp-store.json"));
  });

  it("uses a writable temp directory on Vercel", () => {
    const storePath = resolveStorePath({
      VERCEL: "1",
      TMPDIR: "/tmp/runtime"
    } as unknown as NodeJS.ProcessEnv);

    expect(storePath).toBe(path.join("/tmp/runtime", "outbound-ai-calling-agent", "mvp-store.json"));
  });

  it("allows an explicit store directory override", () => {
    const storePath = resolveStorePath({
      MVP_STORE_DIR: "/custom/store"
    } as unknown as NodeJS.ProcessEnv);

    expect(storePath).toBe(path.join("/custom/store", "mvp-store.json"));
  });

  it("saves, fetches, and lists campaigns through the file-backed store", async () => {
    const originalStoreDir = process.env.MVP_STORE_DIR;
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "campaign-store-"));
    process.env.MVP_STORE_DIR = tempDir;
    try {
      const campaign = createCampaignFromContacts({
        name: "Stored campaign",
        companyName: "UDS",
        defaultLanguage: "hi",
        concurrencyLimit: 1,
        contacts: []
      });

      await saveCampaign(campaign);

      await expect(getCampaign(campaign.id)).resolves.toMatchObject({ id: campaign.id, name: "Stored campaign" });
      await expect(listCampaigns()).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ id: campaign.id })]));
    } finally {
      if (originalStoreDir === undefined) {
        delete process.env.MVP_STORE_DIR;
      } else {
        process.env.MVP_STORE_DIR = originalStoreDir;
      }
    }
  });
});
