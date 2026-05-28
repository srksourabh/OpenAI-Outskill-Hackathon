import Link from "next/link";

export default function HomePage() {
  return (
    <main className="bg-surface text-ink">
      <section className="mx-auto grid min-h-[calc(100dvh-64px)] w-full max-w-7xl content-center gap-6 px-4 py-10">
        <p className="text-sm font-medium uppercase tracking-wide text-muted">Autonomous Calling Agent</p>
        <h1 className="max-w-4xl text-4xl font-semibold sm:text-5xl">eDial helps operations teams run multilingual outbound campaigns with real call intelligence.</h1>
        <p className="max-w-3xl text-base text-muted sm:text-lg">
          Create campaigns, configure agent prompt behavior, monitor system health, capture callback commitments, and export every call outcome with transcript-ready auditability.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white" href="/login">
            Sign In
          </Link>
          <Link className="rounded-md border border-line bg-panel px-4 py-2 text-sm font-semibold" href="/campaigns">
            Open Campaign Workspace
          </Link>
          <Link className="rounded-md border border-line bg-panel px-4 py-2 text-sm font-semibold" href="/health">
            View Health Dashboard
          </Link>
        </div>
        <div className="grid gap-4 pt-6 sm:grid-cols-3">
          <article className="rounded-lg border border-line bg-panel p-4">
            <h2 className="text-lg font-semibold">Campaign Control</h2>
            <p className="mt-2 text-sm text-muted">Single number, number list, and spreadsheet intake with live status tracking and follow-up signal capture.</p>
          </article>
          <article className="rounded-lg border border-line bg-panel p-4">
            <h2 className="text-lg font-semibold">Prompt Studio</h2>
            <p className="mt-2 text-sm text-muted">Set agent tone, voice, language, and prompt blending with clear preview of final system instructions.</p>
          </article>
          <article className="rounded-lg border border-line bg-panel p-4">
            <h2 className="text-lg font-semibold">Reliable Exports</h2>
            <p className="mt-2 text-sm text-muted">Download CSV and Excel-ready exports including callback time, remarks, transcripts, and disposition outcomes.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
