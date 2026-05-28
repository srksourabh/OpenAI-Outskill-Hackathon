"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const demoAccounts = [
  { role: "Admin", email: "admin@edial.ai", password: "Admin@123" },
  { role: "User", email: "user@edial.ai", password: "User@123" }
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(demoAccounts[0].email);
  const [password, setPassword] = useState(demoAccounts[0].password);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error ?? "Login failed.");
      return;
    }
    router.push("/campaigns");
    router.refresh();
  }

  return (
    <main className="min-h-dvh bg-surface px-4 py-12 text-ink">
      <section className="mx-auto w-full max-w-xl rounded-lg border border-line bg-panel p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Sign in to eDial</h1>
        <p className="mt-2 text-sm text-muted">Use a test account for admin or user access.</p>
        <div className="mt-4 overflow-x-auto rounded-md border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="px-3 py-2 font-semibold">Role</th>
                <th className="px-3 py-2 font-semibold">Email</th>
                <th className="px-3 py-2 font-semibold">Password</th>
              </tr>
            </thead>
            <tbody>
              {demoAccounts.map((account) => (
                <tr className="border-b border-line last:border-b-0" key={account.email}>
                  <td className="px-3 py-2">{account.role}</td>
                  <td className="px-3 py-2 font-mono text-xs">{account.email}</td>
                  <td className="px-3 py-2 font-mono text-xs">{account.password}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form className="mt-5 space-y-3" onSubmit={submit}>
          <label className="block text-sm font-medium">
            Email
            <input className="mt-1 w-full rounded-md border border-line px-3 py-2" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input
              className="mt-1 w-full rounded-md border border-line px-3 py-2"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={busy} type="submit">
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>
        {message ? <p className="mt-3 text-sm text-red-700">{message}</p> : null}
      </section>
    </main>
  );
}
