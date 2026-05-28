import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAdmin } from "@/lib/auth";
import { getSessionRole } from "@/lib/session";

vi.mock("@/lib/session", () => ({
  getSessionRole: vi.fn()
}));

const mockedGetSessionRole = vi.mocked(getSessionRole);

function makeRequest(headers?: HeadersInit) {
  return new Request("http://localhost/api/campaigns", { headers });
}

describe("requireAdmin", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    mockedGetSessionRole.mockReset();
  });

  it("allows local development requests when the admin key is not configured", async () => {
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("ADMIN_API_KEY", "replace-with-admin-api-key");
    mockedGetSessionRole.mockResolvedValue(null);

    await expect(requireAdmin(makeRequest())).resolves.toBeNull();
  });

  it("fails closed in production when the admin key is not configured", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("ADMIN_API_KEY", "replace-with-admin-api-key");
    mockedGetSessionRole.mockResolvedValue(null);

    const response = await requireAdmin(makeRequest());

    expect(response?.status).toBe(401);
    await expect(response?.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("denies non-admin sessions even in development fallback mode", async () => {
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("ADMIN_API_KEY", "replace-with-admin-api-key");
    mockedGetSessionRole.mockResolvedValue("user");

    const response = await requireAdmin(makeRequest());

    expect(response?.status).toBe(401);
  });

  it("allows admin sessions without an admin key header", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("ADMIN_API_KEY", "real-admin-key");
    mockedGetSessionRole.mockResolvedValue("admin");

    await expect(requireAdmin(makeRequest())).resolves.toBeNull();
  });

  it("allows a matching admin key header when no session is present", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("ADMIN_API_KEY", "real-admin-key");
    mockedGetSessionRole.mockResolvedValue(null);

    await expect(requireAdmin(makeRequest({ "x-admin-key": "real-admin-key" }))).resolves.toBeNull();
  });

  it("requires the matching admin key when a real key is configured", async () => {
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("ADMIN_API_KEY", "real-admin-key");
    mockedGetSessionRole.mockResolvedValue(null);

    const response = await requireAdmin(makeRequest());

    expect(response?.status).toBe(401);
  });
});
