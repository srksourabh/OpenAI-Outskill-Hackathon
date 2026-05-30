export default function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-surface px-4 py-10 text-ink">
      <section className="mx-auto w-full max-w-3xl rounded-[32px] bg-panel p-6 text-ink shadow-[9px_9px_16px_rgb(163,177,198,0.6),-9px_-9px_16px_rgba(255,255,255,0.5)]">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-muted">Protected MVP operations</p>
        <h1 className="mt-2 text-4xl font-black text-accent">Privacy Policy</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          eDial stores campaign contacts, call outcomes, recordings links, transcripts, and operator settings to provide outbound campaign operations.
        </p>
        <div className="mt-5 space-y-3 rounded-[24px] bg-panel p-5 text-sm shadow-[inset_4px_4px_8px_rgb(163,177,198,0.6),inset_-4px_-4px_8px_rgba(255,255,255,0.5)]">
          <p>1. Access is restricted to authenticated users.</p>
          <p>2. Admin users can modify campaign and agent settings.</p>
          <p>3. Call data can be exported in CSV and Excel-compatible format for operations workflows.</p>
          <p>4. Sensitive credentials must be managed in environment variables and never uploaded in contact sheets.</p>
        </div>
      </section>
    </main>
  );
}
