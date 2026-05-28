import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/session", () => ({
  getSessionRole: vi.fn()
}));

function makeRequest(headers?: HeadersInit) {
  return new Request("http://localhost/api/campaigns", { headers });
}

async function loadAuth() {
  const { requireAdmin } = await import("@/lib/auth");
  const { getSessionRole } = await import("@/lib/session");
  return {
    requireAdmin,
    mockedGetSessionRole: vi.mocked(getSessionRole)
  };
}

describe("requireAdmin", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("rejects local development requests when the admin key is not configured", async () => {
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("ADMIN_API_KEY", "replace-with-admin-api-key");
    const { requireAdmin, mockedGetSessionRole } = await loadAuth();
    mockedGetSessionRole.mockResolvedValue(null);

    const response = await requireAdmin(makeRequest());

    expect(response?.status).toBe(401);
  });

  it("fails closed in production when the admin key is not configured", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("ADMIN_API_KEY", "replace-with-admin-api-key");
    const { requireAdmin, mockedGetSessionRole } = await loadAuth();
    mockedGetSessionRole.mockResolvedValue(null);

    const response = await requireAdmin(makeRequest());

    expect(response?.status).toBe(401);
    await expect(response?.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("denies non-admin sessions even in development fallback mode", async () => {
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("ADMIN_API_KEY", "replace-with-admin-api-key");
    const { requireAdmin, mockedGetSessionRole } = await loadAuth();
    mockedGetSessionRole.mockResolvedValue("user");

    const response = await requireAdmin(makeRequest());

    expect(response?.status).toBe(401);
  });

  it("allows admin sessions without an admin key header", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("ADMIN_API_KEY", "real-admin-key");
    const { requireAdmin, mockedGetSessionRole } = await loadAuth();
    mockedGetSessionRole.mockResolvedValue("admin");

    await expect(requireAdmin(makeRequest())).resolves.toBeNull();
  });

  it("allows a matching admin key header when no session is present", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("ADMIN_API_KEY", "real-admin-key");
    const { requireAdmin, mockedGetSessionRole } = await loadAuth();
    mockedGetSessionRole.mockResolvedValue(null);

    await expect(requireAdmin(makeRequest({ "x-admin-key": "real-admin-key" }))).resolves.toBeNull();
  });

  it("requires the matching admin key when a real key is configured", async () => {
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("ADMIN_API_KEY", "real-admin-key");
    const { requireAdmin, mockedGetSessionRole } = await loadAuth();
    mockedGetSessionRole.mockResolvedValue(null);

    const response = await requireAdmin(makeRequest());

    expect(response?.status).toBe(401);
  });
});
