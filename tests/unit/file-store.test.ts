import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveStorePath } from "@/services/campaigns/file-store";

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
});
