import { cookies } from "next/headers";

export type SessionRole = "admin" | "user";

export const SESSION_COOKIE_NAME = "edial_session_role";

export const TEST_USERS = [
  { email: "admin@edial.ai", password: "Admin@123", role: "admin" as const, label: "Admin" },
  { email: "user@edial.ai", password: "User@123", role: "user" as const, label: "User" }
];

export function resolveTestUser(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  return TEST_USERS.find((user) => user.email === normalized && user.password === password) ?? null;
}

export async function getSessionRole(): Promise<SessionRole | null> {
  const store = await cookies();
  const role = store.get(SESSION_COOKIE_NAME)?.value;
  if (role === "admin" || role === "user") return role;
  return null;
}
