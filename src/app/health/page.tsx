"use client";

import { useEffect, useState } from "react";

type HealthPayload = {
  ok: boolean;
  status: "ok" | "warn" | "fail";
  service: string;
  checked_at: string;
  metrics: {
    campaigns: number;
    calls: number;
  };
  components: Array<{
    name: string;
    status: "ok" | "warn" | "fail";
    detail: string;
  }>;
};

export default function HealthPage() {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadHealth() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/health", { cache: "no-store" });
    const data = (await response.json().catch(() => null)) as HealthPayload | null;
    if (!response.ok || !data) {
      setError("Health service unavailable.");
      setLoading(false);
      return;
    }
    setHealth(data);
    setLoading(false);
  }

  useEffect(() => {
    void loadHealth();
    const timer = setInterval(() => {
      void loadHealth();
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="min-h-dvh bg-surface px-4 py-8 text-white">
      <section className="mx-auto w-full max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-accent">Operations readiness</p>
            <h1 className="mt-2 text-5xl font-black leading-tight tracking-[-0.62px] text-accent">System Health</h1>
            <p className="mt-2 text-base text-white">Track component readiness for campaigns, AI, telephony, and exports.</p>
          </div>
          <button className="rounded-md bg-white px-4 py-3 text-sm font-black text-ink" onClick={() => void loadHealth()} type="button">
            Refresh
          </button>
        </div>

        {loading ? <p className="mt-6 text-sm text-white">Loading health checks...</p> : null}
        {error ? <p className="mt-6 rounded-md bg-white px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}

        {health ? (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <StatCard label="Overall status" value={health.status.toUpperCase()} level={health.status} />
              <StatCard label="Campaigns in store" value={String(health.metrics.campaigns)} level="ok" />
              <StatCard label="Calls in store" value={String(health.metrics.calls)} level="ok" />
            </div>
            <p className="mt-3 text-xs text-muted">Last checked at: {health.checked_at}</p>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {health.components.map((component) => (
                <article className="rounded-2xl bg-panel p-5 text-ink" key={component.name}>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold">{component.name}</h2>
                    <StatusPill status={component.status} />
                  </div>
                  <p className="mt-2 text-sm text-muted">{component.detail}</p>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}

function StatusPill({ status }: { status: "ok" | "warn" | "fail" }) {
  const styles =
    status === "ok"
      ? "border-green-200 bg-green-50 text-green-800"
      : status === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-red-200 bg-red-50 text-red-800";

  return <span className={`rounded border px-2 py-1 text-xs font-semibold uppercase ${styles}`}>{status}</span>;
}

function StatCard({ label, value, level }: { label: string; value: string; level: "ok" | "warn" | "fail" }) {
  const styles =
    level === "ok" ? "border-green-200" : level === "warn" ? "border-amber-200" : "border-red-200";

  return (
    <article className={`rounded-2xl border-2 bg-panel p-5 text-ink ${styles}`}>
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </article>
  );
}
