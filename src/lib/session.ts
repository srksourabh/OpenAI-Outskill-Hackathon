import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "@/config/env";

export type SessionRole = "admin" | "user";

export type AuthenticatedUser = {
  email: string;
  role: SessionRole;
  label: string;
};

type SessionPayload = {
  v: 1;
  email: string;
  role: SessionRole;
  label: string;
  exp: number;
};

type StoredAuthUser = AuthenticatedUser & {
  password: string;
};

const ONE_DAY_SECONDS = 60 * 60 * 24;
const SESSION_VERSION = 1;
const MIN_SESSION_SECRET_LENGTH = 32;

export const SESSION_COOKIE_NAME = "edial_session";
export const SESSION_MAX_AGE_SECONDS = ONE_DAY_SECONDS;

function isProduction() {
  return process.env.NODE_ENV === "production" || env.appEnv === "production";
}

function isUsableSecret(value: string | undefined) {
  return Boolean(value && value.length >= MIN_SESSION_SECRET_LENGTH && !value.startsWith("replace-with"));
}

function getSessionSecret() {
  if (isUsableSecret(env.sessionSecret)) return env.sessionSecret;
  if (!isProduction()) return "local-development-session-secret-change-before-production";
  return null;
}

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function isSessionRole(value: unknown): value is SessionRole {
  return value === "admin" || value === "user";
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function safePasswordEquals(supplied: string, configured: string) {
  const suppliedBuffer = Buffer.from(supplied);
  const configuredBuffer = Buffer.from(configured);
  if (suppliedBuffer.length !== configuredBuffer.length) return false;
  return timingSafeEqual(suppliedBuffer, configuredBuffer);
}

function configuredUsers(): StoredAuthUser[] {
  const users: StoredAuthUser[] = [];

  if (env.authAdminEmail && env.authAdminPassword) {
    users.push({ email: normalizeEmail(env.authAdminEmail), password: env.authAdminPassword, role: "admin", label: "Admin" });
  }

  if (env.authUserEmail && env.authUserPassword) {
    users.push({ email: normalizeEmail(env.authUserEmail), password: env.authUserPassword, role: "user", label: "User" });
  }

  if (users.length === 0 && !isProduction()) {
    users.push(
      { email: "admin@edial.ai", password: "Admin@123", role: "admin", label: "Local Admin" },
      { email: "user@edial.ai", password: "User@123", role: "user", label: "Local User" }
    );
  }

  return users;
}

export function resolveLoginUser(email: string, password: string): AuthenticatedUser | null {
  const normalized = normalizeEmail(email);
  const user = configuredUsers().find((candidate) => candidate.email === normalized);
  if (!user || !safePasswordEquals(password, user.password)) return null;
  return { email: user.email, role: user.role, label: user.label };
}

export function createSessionCookie(user: AuthenticatedUser, now = Date.now()) {
  const secret = getSessionSecret();
  if (!secret) return null;

  const payload: SessionPayload = {
    v: SESSION_VERSION,
    email: user.email,
    role: user.role,
    label: user.label,
    exp: now + SESSION_MAX_AGE_SECONDS * 1000
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export function verifySessionCookie(value: string | undefined, now = Date.now()): SessionPayload | null {
  if (!value) return null;
  const secret = getSessionSecret();
  if (!secret) return null;

  const [encodedPayload, signature, extra] = value.split(".");
  if (!encodedPayload || !signature || extra !== undefined) return null;

  const expectedSignature = signPayload(encodedPayload, secret);
  if (!constantTimeEqual(signature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<SessionPayload>;
    if (payload.v !== SESSION_VERSION) return null;
    if (!isSessionRole(payload.role)) return null;
    if (typeof payload.email !== "string" || typeof payload.label !== "string") return null;
    if (typeof payload.exp !== "number" || payload.exp <= now) return null;
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSessionRole(): Promise<SessionRole | null> {
  const store = await cookies();
  return verifySessionCookie(store.get(SESSION_COOKIE_NAME)?.value)?.role ?? null;
}
