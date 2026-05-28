export default function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-surface px-4 py-10 text-white">
      <section className="mx-auto w-full max-w-3xl rounded-2xl bg-panel p-6 text-ink">
        <p className="text-sm font-black uppercase tracking-wide text-surface">Protected operations</p>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.62px]">Privacy Policy</h1>
        <p className="mt-3 text-sm text-muted">
          eDial stores campaign contacts, call outcomes, recordings links, transcripts, and operator settings to provide outbound campaign operations.
        </p>
        <div className="mt-5 space-y-3 text-sm">
          <p>1. Access is restricted to authenticated users.</p>
          <p>2. Admin users can modify campaign and agent settings.</p>
          <p>3. Call data can be exported in CSV and Excel-compatible format for operations workflows.</p>
          <p>4. Sensitive credentials must be managed in environment variables and never uploaded in contact sheets.</p>
        </div>
      </section>
    </main>
  );
}
