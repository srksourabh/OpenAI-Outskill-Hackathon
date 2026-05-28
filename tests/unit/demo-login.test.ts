import { beforeEach, describe, expect, it, vi } from "vitest";

describe("hackathon demo login accounts", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("publishes both admin and user demo credentials", async () => {
    const { DEMO_LOGIN_ACCOUNTS } = await import("@/lib/demo-accounts");

    expect(DEMO_LOGIN_ACCOUNTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: "admin@edial.ai", password: "Admin@123", role: "admin", label: "Test Admin" }),
        expect.objectContaining({ email: "user@edial.ai", password: "User@123", role: "user", label: "Test User" })
      ])
    );
  });

  it("publishes detailed role features for hackathon reviewers", async () => {
    const { DEMO_LOGIN_ACCOUNTS } = await import("@/lib/demo-accounts");

    expect(DEMO_LOGIN_ACCOUNTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: "admin@edial.ai",
          bestFor: "Judges testing the complete operator workflow.",
          features: expect.arrayContaining([
            "Create campaigns from single numbers, number lists, CSV, or Excel uploads.",
            "Start live calling campaigns, retry eligible calls, and manage campaign actions.",
            "Export all results, engineer-ready pickups, and follow-up rows for operations handoff."
          ])
        }),
        expect.objectContaining({
          email: "user@edial.ai",
          bestFor: "Stakeholders reviewing outcomes without changing data.",
          features: expect.arrayContaining([
            "Review campaign dashboards, call outcomes, transcripts, summaries, and next actions.",
            "Use filters and download result exports without changing campaign data.",
            "Validate the read-only stakeholder experience for founders, judges, and operations reviewers."
          ])
        })
      ])
    );
  });

  it("accepts the advertised demo accounts in production mode", async () => {
    vi.stubEnv("APP_ENV", "production");

    const { resolveLoginUser } = await import("@/lib/session");

    expect(resolveLoginUser("admin@edial.ai", "Admin@123")).toMatchObject({ email: "admin@edial.ai", role: "admin", label: "Test Admin" });
    expect(resolveLoginUser("user@edial.ai", "User@123")).toMatchObject({ email: "user@edial.ai", role: "user", label: "Test User" });
  });

  it("keeps the advertised demo password working even when the same email is configured", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("AUTH_ADMIN_EMAIL", "admin@edial.ai");
    vi.stubEnv("AUTH_ADMIN_PASSWORD", "ConfiguredOnly@123");

    const { resolveLoginUser } = await import("@/lib/session");

    expect(resolveLoginUser("admin@edial.ai", "Admin@123")).toMatchObject({ email: "admin@edial.ai", role: "admin", label: "Test Admin" });
  });
});
