"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_LOGIN_ACCOUNTS } from "@/lib/demo-accounts";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <main className="min-h-dvh bg-surface px-4 py-12 text-white">
      <section className="mx-auto w-full max-w-5xl">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-wide text-accent">Hackathon access</p>
          <h1 className="mt-2 text-5xl font-black leading-tight tracking-[-0.62px] text-accent">Sign in to eDial</h1>
          <p className="mt-3 text-lg leading-7 text-white">Use one of these demo accounts to review the product in a polished operations workspace.</p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {DEMO_LOGIN_ACCOUNTS.map((account) => (
            <button
              className="rounded-2xl bg-panel p-5 text-left text-ink transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-accent"
              key={account.email}
              onClick={() => {
                setEmail(account.email);
                setPassword(account.password);
                setMessage("");
              }}
              type="button"
            >
              <span className="block text-xl font-black">{account.label}</span>
              <span className="mt-2 block text-xs text-muted">{account.helpText}</span>
              <span className="mt-3 block rounded-md border-2 border-surface px-3 py-2 font-mono text-xs text-ink">
                ID: {account.email}
                <br />
                Password: {account.password}
              </span>
              <span className="mt-3 block rounded-md bg-accent px-3 py-2 text-xs font-black text-ink">Best for: {account.bestFor}</span>
              <ul className="mt-3 space-y-2 text-xs leading-5 text-muted">
                {account.features.map((feature) => (
                  <li className="flex gap-2" key={feature}>
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-surface" aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
        <form className="mt-5 space-y-3 rounded-2xl bg-panel p-5 text-ink" onSubmit={submit}>
          <label className="block text-sm font-medium">
            Email
            <input className="mt-1 w-full rounded-md border-2 border-surface px-3 py-2" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input
              className="mt-1 w-full rounded-md border-2 border-surface px-3 py-2"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button className="rounded-md bg-accent px-4 py-2 text-sm font-black text-ink disabled:opacity-60" disabled={busy} type="submit">
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>
        {message ? <p className="mt-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-red-700">{message}</p> : null}
      </section>
    </main>
  );
}
