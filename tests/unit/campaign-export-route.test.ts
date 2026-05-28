import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/campaigns/[id]/export/route";
import { getCampaign } from "@/services/campaigns/file-store";
import { getSessionRole } from "@/lib/session";

vi.mock("@/lib/session", () => ({
  getSessionRole: vi.fn()
}));

vi.mock("@/services/campaigns/file-store", () => ({
  getCampaign: vi.fn()
}));

const mockedGetCampaign = vi.mocked(getCampaign);
const mockedGetSessionRole = vi.mocked(getSessionRole);

describe("campaign export route", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    mockedGetCampaign.mockReset();
    mockedGetSessionRole.mockReset();
  });

  it("rejects unauthenticated exports before loading campaign data", async () => {
    vi.stubEnv("ADMIN_API_KEY", "replace-with-admin-key");
    mockedGetSessionRole.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/campaigns/campaign-1/export"), {
      params: Promise.resolve({ id: "campaign-1" })
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(mockedGetCampaign).not.toHaveBeenCalled();
  });

  it.each(["admin", "user"] as const)("allows %s session exports", async (role) => {
    mockedGetSessionRole.mockResolvedValue(role);
    mockedGetCampaign.mockResolvedValue({
      id: "campaign-1",
      name: "Demo Export",
      company_name: "UDS",
      default_language: "hi",
      status: "completed",
      provider: "simulated",
      self_improvement_notes: "",
      retry_limit: 2,
      concurrency_limit: 5,
      prompt_config: {
        asset_label: "POS machine",
        reference_label: "order",
        account_label: "company",
        account_name: ""
      },
      agent_settings: {
        voice_preset: "indian_female_natural",
        voice_id: "marin",
        tone: "warm",
        prompt_enhancement: "",
        self_improve_enabled: false
      },
      contacts: [],
      calls: [],
      call_events: [],
      created_at: "2026-05-28T00:00:00.000Z"
    });

    const response = await GET(new Request("http://localhost/api/campaigns/campaign-1/export"), {
      params: Promise.resolve({ id: "campaign-1" })
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toContain("demo-export-results.csv");
    expect(mockedGetCampaign).toHaveBeenCalledWith("campaign-1");
  });

  it("uses an HTML format contract for the table export payload", async () => {
    mockedGetSessionRole.mockResolvedValue("admin");
    mockedGetCampaign.mockResolvedValue({
      id: "campaign-1",
      name: "Demo Export",
      company_name: "UDS",
      default_language: "hi",
      status: "completed",
      provider: "simulated",
      self_improvement_notes: "",
      retry_limit: 2,
      concurrency_limit: 5,
      prompt_config: {
        asset_label: "POS machine",
        reference_label: "order",
        account_label: "company",
        account_name: ""
      },
      agent_settings: {
        voice_preset: "indian_female_natural",
        voice_id: "marin",
        tone: "warm",
        prompt_enhancement: "",
        self_improve_enabled: false
      },
      contacts: [],
      calls: [],
      call_events: [],
      created_at: "2026-05-28T00:00:00.000Z"
    });

    const response = await GET(new Request("http://localhost/api/campaigns/campaign-1/export?format=html"), {
      params: Promise.resolve({ id: "campaign-1" })
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/html");
    expect(response.headers.get("Content-Disposition")).toContain("demo-export-results.html");
    expect(await response.text()).toContain("<table");
  });

  it("rejects xlsx requests because the export payload is not a real XLSX workbook", async () => {
    mockedGetSessionRole.mockResolvedValue("admin");

    const response = await GET(new Request("http://localhost/api/campaigns/campaign-1/export?format=xlsx"), {
      params: Promise.resolve({ id: "campaign-1" })
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Unsupported export format. Use format=csv or format=html." });
    expect(mockedGetCampaign).not.toHaveBeenCalled();
  });
});
