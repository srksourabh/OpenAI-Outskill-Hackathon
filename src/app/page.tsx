import Link from "next/link";

const mvpSteps = [
  ["01", "Upload contacts", "CSV, XLSX, one number, or pasted number list."],
  ["02", "Validate details", "Normalize phones, remove duplicates, and preserve source columns."],
  ["03", "Run parallel calls", "Start bounded batches with Hindi-first agent settings."],
  ["04", "Analyze outcomes", "Capture feasibility, sentiment, summary, transcript, and next action."],
  ["05", "Export handoff", "Download CSV or Excel-ready files for operations teams."]
];

const proofCards = [
  ["Built for MVP demo", "Upload 10 contacts, start calls, review results, export handoff."],
  ["Parallel by default", "Campaigns can run many calls at a time instead of manual one-by-one dialing."],
  ["Operations-ready", "Every result keeps original sheet data plus AI-enriched call evidence."]
];

export default function HomePage() {
  return (
    <main className="bg-surface text-ink">
      <section className="mx-auto grid min-h-[calc(100dvh-64px)] w-full max-w-7xl content-center gap-8 px-4 py-8">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)]">
          <div className="rounded-[32px] bg-panel p-6 shadow-[9px_9px_16px_rgb(163,177,198,0.6),-9px_-9px_16px_rgba(255,255,255,0.5)] sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-muted">Outbound AI calling MVP</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight text-accent sm:text-6xl">
              Smart outbound calling tool for feasibility checks and sentiment analysis, many calls at a time.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-7 text-muted sm:text-xl">
              Upload contacts, launch bounded parallel calls, confirm pickup or de-installation readiness, classify receiver sentiment, and export clean operations-ready results.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="rounded-2xl bg-accent px-5 py-3 text-sm font-black text-white shadow-[5px_5px_10px_rgb(163,177,198,0.6),-5px_-5px_10px_rgba(255,255,255,0.5)]" href="/login">
                Open MVP
              </Link>
              <Link className="rounded-2xl bg-panel px-5 py-3 text-sm font-black text-ink shadow-[5px_5px_10px_rgb(163,177,198,0.6),-5px_-5px_10px_rgba(255,255,255,0.5)]" href="/campaigns/contacts">
                Add Contacts
              </Link>
              <Link className="rounded-2xl bg-panel px-5 py-3 text-sm font-black text-accent shadow-[inset_4px_4px_8px_rgb(163,177,198,0.6),inset_-4px_-4px_8px_rgba(255,255,255,0.5)]" href="/health">
                System Health
              </Link>
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {proofCards.map(([title, body]) => (
                <article className="rounded-2xl bg-panel p-4 shadow-[inset_4px_4px_8px_rgb(163,177,198,0.6),inset_-4px_-4px_8px_rgba(255,255,255,0.5)]" key={title}>
                  <h2 className="text-sm font-black">{title}</h2>
                  <p className="mt-2 text-xs leading-5 text-muted">{body}</p>
                </article>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-[32px] bg-panel text-ink shadow-[9px_9px_16px_rgb(163,177,198,0.6),-9px_-9px_16px_rgba(255,255,255,0.5)]">
            <img alt="eDial voice operations board" className="h-56 w-full object-cover" src="/codex-voice-ops.svg" />
            <div className="p-5">
              <div className="flex items-center justify-between">
                <span className="rounded-2xl bg-accent px-3 py-2 text-sm font-black text-white">MVP flow</span>
                <span className="font-mono text-sm text-muted">5 active calls</span>
              </div>
              <div className="mt-5 grid gap-3">
                {mvpSteps.map(([number, title, body]) => (
                  <div className="rounded-2xl bg-panel p-4 shadow-[inset_4px_4px_8px_rgb(163,177,198,0.6),inset_-4px_-4px_8px_rgba(255,255,255,0.5)]" key={title}>
                    <div className="text-xs font-black uppercase text-accent">{number}</div>
                    <div className="mt-1 text-lg font-black">{title}</div>
                    <p className="mt-1 text-sm leading-5 text-muted">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-4 pt-2 sm:grid-cols-3">
          <article className="rounded-[28px] bg-panel p-6 shadow-[5px_5px_10px_rgb(163,177,198,0.6),-5px_-5px_10px_rgba(255,255,255,0.5)]">
            <h2 className="text-xl font-black">Contact Intake</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Use one number for a quick proof, paste a list, or upload the required MVP CSV/XLSX columns.</p>
          </article>
          <article className="rounded-[28px] bg-panel p-6 shadow-[5px_5px_10px_rgb(163,177,198,0.6),-5px_-5px_10px_rgba(255,255,255,0.5)]">
            <h2 className="text-xl font-black">Feasibility + Sentiment</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Confirm readiness, capture blockers, detect attitude, and keep low-confidence calls in manual review.</p>
          </article>
          <article className="rounded-[28px] bg-accent p-6 text-white shadow-[5px_5px_10px_rgb(163,177,198,0.6),-5px_-5px_10px_rgba(255,255,255,0.5)]">
            <h2 className="text-xl font-black">Exportable Results</h2>
            <p className="mt-2 text-sm leading-6 text-white/90">Preserve every uploaded field and append status, disposition, recording, summary, and next action.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
