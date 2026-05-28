import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookies } from "next/headers";
import { createSessionCookie, getSessionRole, verifySessionCookie } from "@/lib/session";

vi.mock("next/headers", () => ({
  cookies: vi.fn()
}));

const mockedCookies = vi.mocked(cookies);

function mockSessionCookie(value: string | undefined) {
  mockedCookies.mockResolvedValue({
    get: vi.fn().mockReturnValue(value ? { value } : undefined)
  } as never);
}

describe("signed auth sessions", () => {
  beforeEach(() => {
    mockedCookies.mockReset();
  });

  it("rejects the old forged role-only admin cookie", async () => {
    mockSessionCookie("admin");

    await expect(getSessionRole()).resolves.toBeNull();
    expect(verifySessionCookie("admin")).toBeNull();
  });

  it("accepts an untampered signed admin session", async () => {
    const cookie = createSessionCookie({ email: "admin@example.com", role: "admin", label: "Admin" });
    expect(cookie).toBeTruthy();
    mockSessionCookie(cookie ?? undefined);

    await expect(getSessionRole()).resolves.toBe("admin");
  });

  it("rejects a signed cookie after the payload is changed", () => {
    const cookie = createSessionCookie({ email: "user@example.com", role: "user", label: "User" });
    expect(cookie).toBeTruthy();

    const [payload, signature] = cookie!.split(".");
    const tamperedPayload = Buffer.from(JSON.stringify({ v: 1, email: "admin@example.com", role: "admin", label: "Admin", exp: Date.now() + 60_000 })).toString(
      "base64url"
    );

    expect(verifySessionCookie(`${tamperedPayload}.${signature}`)).toBeNull();
    expect(verifySessionCookie(`${payload}.not-the-real-signature`)).toBeNull();
  });

  it("rejects expired signed sessions", () => {
    const now = Date.now();
    const cookie = createSessionCookie({ email: "admin@example.com", role: "admin", label: "Admin" }, now);

    expect(verifySessionCookie(cookie ?? undefined, now + 25 * 60 * 60 * 1000)).toBeNull();
  });
});
