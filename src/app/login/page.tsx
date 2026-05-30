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
    <main className="min-h-dvh bg-surface px-4 py-10 text-ink">
      <section className="mx-auto w-full max-w-5xl">
        <div className="rounded-[32px] bg-panel p-6 shadow-[9px_9px_16px_rgb(163,177,198,0.6),-9px_-9px_16px_rgba(255,255,255,0.5)] sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-muted">MVP demo access</p>
          <h1 className="mt-2 text-4xl font-black leading-tight text-accent sm:text-5xl">Sign in to run the outbound calling MVP</h1>
          <p className="mt-3 max-w-3xl text-lg leading-7 text-muted">
            Use a demo account to upload contacts, tune the agent, start parallel feasibility calls, and inspect sentiment-ready outcomes.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {DEMO_LOGIN_ACCOUNTS.map((account) => (
            <button
              className="rounded-[28px] bg-panel p-5 text-left text-ink shadow-[7px_7px_14px_rgb(163,177,198,0.6),-7px_-7px_14px_rgba(255,255,255,0.5)] transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-accent"
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
              <span className="mt-3 block rounded-2xl bg-panel px-3 py-2 font-mono text-xs text-ink shadow-[inset_4px_4px_8px_rgb(163,177,198,0.6),inset_-4px_-4px_8px_rgba(255,255,255,0.5)]">
                ID: {account.email}
                <br />
                Password: {account.password}
              </span>
              <span className="mt-3 block rounded-2xl bg-accent px-3 py-2 text-xs font-black text-white">Best for: {account.bestFor}</span>
              <ul className="mt-3 space-y-2 text-xs leading-5 text-muted">
                {account.features.map((feature) => (
                  <li className="flex gap-2" key={feature}>
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
        <form className="mt-5 space-y-3 rounded-[28px] bg-panel p-5 text-ink shadow-[9px_9px_16px_rgb(163,177,198,0.6),-9px_-9px_16px_rgba(255,255,255,0.5)]" onSubmit={submit}>
          <label className="block text-sm font-medium">
            Email
            <input className="mt-1 w-full rounded-2xl border-0 bg-panel px-4 py-3 shadow-[inset_4px_4px_8px_rgb(163,177,198,0.6),inset_-4px_-4px_8px_rgba(255,255,255,0.5)]" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input
              className="mt-1 w-full rounded-2xl border-0 bg-panel px-4 py-3 shadow-[inset_4px_4px_8px_rgb(163,177,198,0.6),inset_-4px_-4px_8px_rgba(255,255,255,0.5)]"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button className="rounded-2xl bg-accent px-5 py-3 text-sm font-black text-white shadow-[5px_5px_10px_rgb(163,177,198,0.6),-5px_-5px_10px_rgba(255,255,255,0.5)] disabled:opacity-60" disabled={busy} type="submit">
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>
        {message ? <p className="mt-3 rounded-2xl bg-panel px-4 py-3 text-sm font-semibold text-red-700 shadow-[inset_4px_4px_8px_rgb(163,177,198,0.6),inset_-4px_-4px_8px_rgba(255,255,255,0.5)]">{message}</p> : null}
      </section>
    </main>
  );
}
