import Link from "next/link";

export default function HomePage() {
  return (
    <main className="bg-surface text-white">
      <section className="mx-auto grid min-h-[calc(100dvh-64px)] w-full max-w-7xl content-center gap-8 px-4 py-8">
        <p className="text-sm font-black uppercase tracking-wide text-accent">Autonomous Calling Agent</p>
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <div>
            <h1 className="max-w-4xl text-5xl font-black leading-tight text-accent sm:text-6xl">
              Simultaneous call sentiment analysis for outbound operations.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-7 text-white sm:text-xl">
              Create bounded parallel call campaigns, detect receiver sentiment, monitor campaign health, capture callback commitments, and export every outcome with transcript-ready auditability.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="rounded-md bg-white px-5 py-3 text-sm font-black text-ink" href="/login">
                Sign In
              </Link>
              <Link className="rounded-md border-2 border-white px-5 py-3 text-sm font-black text-white" href="/campaigns#start">
                Open Start Guide
              </Link>
              <Link className="rounded-md border-2 border-accent px-5 py-3 text-sm font-black text-accent" href="/health">
                View Health Dashboard
              </Link>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl bg-white text-ink">
            <img alt="Codex generated eDial voice operations board" className="h-64 w-full object-cover" src="/codex-voice-ops.svg" />
            <div className="border-t-4 border-surface p-4">
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-accent px-3 py-2 text-sm font-black">Live board</span>
                <span className="font-mono text-sm">PLIVO</span>
              </div>
              <div className="mt-5 grid gap-3">
                {["Upload contacts", "Tune Hindi-first agent", "Run parallel calls", "Analyze sentiment", "Download outcomes"].map((item, index) => (
                  <div className="rounded-2xl border-2 border-surface p-4" key={item}>
                    <div className="text-xs font-black uppercase text-surface">0{index + 1}</div>
                    <div className="mt-1 text-lg font-black">{item}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-4 pt-2 sm:grid-cols-3">
          <article className="rounded-2xl bg-panel p-6 text-ink">
            <h2 className="text-xl font-black">Campaign Control</h2>
            <p className="mt-2 text-sm text-muted">Single number, number list, and spreadsheet intake with bounded simultaneous calls and follow-up signal capture.</p>
          </article>
          <article className="rounded-2xl bg-panel p-6 text-ink">
            <h2 className="text-xl font-black">Sentiment Analysis</h2>
            <p className="mt-2 text-sm text-muted">Classify receiver attitude, QA language and tone, and route uncertain calls to manual review.</p>
          </article>
          <article className="rounded-2xl bg-accent p-6 text-ink">
            <h2 className="text-xl font-black">Reliable Exports</h2>
            <p className="mt-2 text-sm text-muted">Download CSV and Excel-ready exports including callback time, remarks, transcripts, and disposition outcomes.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
