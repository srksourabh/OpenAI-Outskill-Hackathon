"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Campaign = {
  id: string;
  name: string;
  company_name: string;
  provider: string;
  status: string;
  default_language: string;
  concurrency_limit: number;
  contacts: Array<Record<string, unknown>>;
  calls: Array<{
    id: string;
    contact_id: string;
    status: string;
    disposition: string;
    next_action: string;
    summary_text: string;
    recording_url: string;
    detected_language: string;
    retry_eligible: boolean;
  }>;
};

type CampaignResults = {
  rows: Array<Record<string, unknown> & { call: Campaign["calls"][number] | null }>;
  stats: Record<string, number>;
};

type UploadIssue = {
  source_row_number: number;
  source_row_data: Record<string, string>;
  errors: string[];
};

type UploadSummary = {
  imported: number;
  invalid: number;
  duplicates: number;
  source_columns: string[];
  invalid_rows: UploadIssue[];
  duplicate_rows: UploadIssue[];
};

export function CampaignWorkspace() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [results, setResults] = useState<CampaignResults | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(null);

  const selected = useMemo(() => campaigns.find((campaign) => campaign.id === selectedId) ?? campaigns[0], [campaigns, selectedId]);

  useEffect(() => {
    void loadCampaigns();
  }, []);

  useEffect(() => {
    if (selected?.id) void loadResults(selected.id);
  }, [selected?.id]);

  async function loadCampaigns() {
    const response = await fetch("/api/campaigns", { cache: "no-store" });
    const data = (await response.json()) as { campaigns: Campaign[] };
    setCampaigns(data.campaigns);
    if (!selectedId && data.campaigns[0]) setSelectedId(data.campaigns[0].id);
  }

  async function loadResults(campaignId: string) {
    const response = await fetch(`/api/campaigns/${campaignId}/results`, { cache: "no-store" });
    if (!response.ok) return;
    setResults((await response.json()) as CampaignResults);
  }

  async function uploadFile(formData: FormData) {
    setBusy(true);
    setMessage("Uploading and validating contacts...");
    setUploadSummary(null);
    const response = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error ?? "Upload failed");
      return;
    }
    setUploadSummary(data.import_summary as UploadSummary);
    setMessage(`Imported ${data.import_summary.imported} contacts. Invalid: ${data.import_summary.invalid}. Duplicates: ${data.import_summary.duplicates}.`);
    await loadCampaigns();
    setSelectedId(data.campaign.id);
  }

  async function postAction(path: string) {
    if (!selected) return;
    setBusy(true);
    const response = await fetch(path, { method: "POST", body: JSON.stringify({ count: 8 }) });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error ?? "Action failed");
      return;
    }
    setCampaigns((current) => current.map((campaign) => (campaign.id === data.campaign.id ? data.campaign : campaign)));
    setMessage("Campaign updated.");
    await loadResults(data.campaign.id);
  }

  return (
    <main className="min-h-dvh overflow-x-hidden bg-surface text-ink">
      <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-line bg-rail p-5 text-white lg:border-b-0 lg:border-r">
          <div className="text-lg font-semibold">Calling Ops</div>
          <p className="mt-2 text-sm text-white/70">Hindi-first outbound AI campaigns</p>
          <nav className="mt-8 space-y-2 text-sm">
            <a className="block rounded-md bg-white/10 px-3 py-2" href="/campaigns">Campaigns</a>
            <a className="block rounded-md px-3 py-2 text-white/75" href="/api/health">Health</a>
          </nav>
        </aside>

        <section className="min-w-0 p-4 sm:p-6">
          <header className="flex flex-col gap-4 border-b border-line pb-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Campaign command center</h1>
              <p className="mt-1 text-sm text-muted">Upload Excel/CSV, run simultaneous calls, review evidence, export result CSV.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                disabled={!selected || busy}
                onClick={() => postAction(`/api/campaigns/${selected?.id}/start`)}
              >
                Start campaign
              </button>
              <button
                className="rounded-md border border-line bg-panel px-4 py-2 text-sm font-semibold disabled:opacity-50"
                disabled={!selected || busy}
                onClick={() => postAction(`/api/campaigns/${selected?.id}/simulate`)}
              >
                Simulate callbacks
              </button>
              {selected ? (
                <a className="rounded-md border border-line bg-panel px-4 py-2 text-sm font-semibold" href={`/api/campaigns/${selected.id}/export`}>
                  Export CSV
                </a>
              ) : null}
            </div>
          </header>

          <div className="mt-5 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
            <UploadPanel busy={busy} onUpload={uploadFile} />
            <div className="min-w-0 space-y-5">
              <CampaignSelector campaigns={campaigns} selectedId={selected?.id ?? ""} onSelect={setSelectedId} />
              {message ? <div className="rounded-md border border-line bg-panel px-4 py-3 text-sm">{message}</div> : null}
              {uploadSummary ? <UploadSummaryPanel summary={uploadSummary} /> : null}
              {selected ? <MetricBand campaign={selected} stats={results?.stats ?? {}} /> : <EmptyState />}
              {selected ? <ResultsTable rows={results?.rows ?? []} /> : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function UploadPanel({ busy, onUpload }: { busy: boolean; onUpload: (formData: FormData) => void }) {
  const [manualPhone, setManualPhone] = useState("");
  const [manualLanguage, setManualLanguage] = useState("en");
  const [manualProvider, setManualProvider] = useState("plivo");

  function submitManualCheck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!manualPhone.trim()) return;

    const formData = new FormData();
    formData.set("campaign_name", "Manual number check");
    formData.set("company_name", "Demo Logistics");
    formData.set("default_language", manualLanguage);
    formData.set("concurrency_limit", "1");
    formData.set("provider", manualProvider);
    formData.set("file", buildManualUploadFile({ phone: manualPhone, language: manualLanguage }));
    onUpload(formData);
  }

  return (
    <section className="rounded-lg border border-line bg-panel p-4">
      <div>
        <h2 className="text-lg font-semibold">New upload</h2>
        <p className="mt-1 text-sm text-muted">
          Upload `.xlsx` or `.csv`. Phone-only sheets work now if they include a header like `phone`, `mobile`, or `mobile_number`.
        </p>
        <a className="mt-3 inline-flex text-sm font-medium text-accent" href="/sample-mobile-upload.csv" download>
          Download sample upload file
        </a>
      </div>

      <form
        className="mt-4"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          onUpload(new FormData(form));
        }}
      >
        <label className="block text-sm font-medium">
          Campaign name
          <input className="mt-1 w-full rounded-md border border-line px-3 py-2" name="campaign_name" defaultValue="Hindi pickup readiness demo" />
        </label>
        <label className="mt-3 block text-sm font-medium">
          Company name
          <input className="mt-1 w-full rounded-md border border-line px-3 py-2" name="company_name" defaultValue="Demo Logistics" />
        </label>
        <label className="mt-3 block text-sm font-medium">
          Calling mode
          <select className="mt-1 w-full rounded-md border border-line px-3 py-2" name="provider" defaultValue="plivo">
            <option value="plivo">Plivo live call</option>
            <option value="simulated">Simulated demo</option>
          </select>
        </label>
        <label className="mt-3 block text-sm font-medium">
          Default language
          <select className="mt-1 w-full rounded-md border border-line px-3 py-2" name="default_language" defaultValue="en">
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="ta">Tamil</option>
            <option value="bn">Bengali</option>
          </select>
        </label>
        <label className="mt-3 block text-sm font-medium">
          Concurrency limit
          <input className="mt-1 w-full rounded-md border border-line px-3 py-2" min={1} max={25} name="concurrency_limit" type="number" defaultValue={5} />
        </label>
        <label className="mt-3 block text-sm font-medium">
          Contact file
          <input className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2" name="file" type="file" accept=".csv,.xlsx" required />
        </label>
        <button className="mt-4 w-full rounded-md bg-accent px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={busy}>
          Upload and validate
        </button>
      </form>

      <div className="my-5 border-t border-line" />

      <form className="space-y-3" onSubmit={submitManualCheck}>
        <div>
          <h3 className="text-base font-semibold">Quick number check</h3>
          <p className="mt-1 text-sm text-muted">Create a one-contact test campaign without preparing a spreadsheet.</p>
        </div>
        <label className="block text-sm font-medium">
          Mobile number
          <input
            className="mt-1 w-full rounded-md border border-line px-3 py-2"
            placeholder="+919876543210 or 9876543210"
            value={manualPhone}
            onChange={(event) => setManualPhone(event.target.value)}
          />
        </label>
        <label className="block text-sm font-medium">
          Calling mode
          <select className="mt-1 w-full rounded-md border border-line px-3 py-2" value={manualProvider} onChange={(event) => setManualProvider(event.target.value)}>
            <option value="plivo">Plivo live call</option>
            <option value="simulated">Simulated demo</option>
          </select>
        </label>
        <label className="block text-sm font-medium">
          Preferred language
          <select className="mt-1 w-full rounded-md border border-line px-3 py-2" value={manualLanguage} onChange={(event) => setManualLanguage(event.target.value)}>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="ta">Tamil</option>
            <option value="bn">Bengali</option>
          </select>
        </label>
        <button className="w-full rounded-md border border-line bg-panel px-4 py-2 font-semibold disabled:opacity-50" disabled={busy || !manualPhone.trim()}>
          Create quick-check campaign
        </button>
      </form>
    </section>
  );
}

function CampaignSelector({ campaigns, selectedId, onSelect }: { campaigns: Campaign[]; selectedId: string; onSelect: (id: string) => void }) {
  if (campaigns.length === 0) return null;
  return (
    <label className="block rounded-lg border border-line bg-panel p-4 text-sm font-medium">
      Active campaign
      <select className="mt-2 w-full rounded-md border border-line px-3 py-2" value={selectedId} onChange={(event) => onSelect(event.target.value)}>
        {campaigns.map((campaign) => (
          <option key={campaign.id} value={campaign.id}>
            {campaign.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function MetricBand({ campaign, stats }: { campaign: Campaign; stats: Record<string, number> }) {
  const metrics = [
    ["Contacts", campaign.contacts.length],
    ["Queued", stats.queued ?? 0],
    ["Active", stats.active ?? 0],
    ["Completed", stats.completed ?? 0],
    ["Confirmed", stats.confirmedPickup ?? 0],
    ["Follow-up", stats.followUpNeeded ?? 0],
    ["Manual review", stats.manualReview ?? 0],
    ["Retry eligible", stats.retryEligible ?? 0]
  ];
  return (
    <section className="rounded-lg border border-line bg-panel">
      <div className="border-b border-line p-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold">{campaign.name}</h2>
          <span className="rounded bg-surface px-2 py-1 text-xs">{campaign.status}</span>
          <span className="rounded bg-surface px-2 py-1 text-xs">Default: {campaign.default_language}</span>
          <span className="rounded bg-surface px-2 py-1 text-xs">Concurrency: {campaign.concurrency_limit}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8">
        {metrics.map(([label, value]) => (
          <div className="border-b border-r border-line p-3" key={label}>
            <div className="text-xs text-muted">{label}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ResultsTable({ rows }: { rows: CampaignResults["rows"] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-panel">
      <div className="border-b border-line p-4">
        <h2 className="text-lg font-semibold">Results and uploaded details</h2>
      </div>
      <div className="space-y-3 p-4 md:hidden">
        {rows.length === 0 ? <div className="py-4 text-center text-sm text-muted">Upload contacts to create the first campaign.</div> : null}
        {rows.map((row) => (
          <article className="rounded-md border border-line bg-surface p-3" key={String(row.contact_id)}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{String(row.provider_name ?? "")}</div>
                <div className="mt-1 font-mono text-sm text-muted">{String(row.phone ?? "")}</div>
              </div>
              <span className="rounded bg-panel px-2 py-1 text-xs">{row.call?.status ?? "not queued"}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <InfoField label="Location" value={String(row.location ?? "")} />
              <InfoField label="Order" value={String(row.order_id ?? "")} />
              <InfoField label="Language" value={String(row.language_hint ?? "")} />
              <InfoField label="Detected" value={row.call?.detected_language ?? "-"} />
              <InfoField label="Disposition" value={row.call?.disposition ?? "unknown"} />
              <InfoField label="Next action" value={row.call?.next_action ?? "none"} />
            </div>
            <div className="mt-3 text-sm text-muted">{row.call?.summary_text ?? "No remarks yet."}</div>
            <div className="mt-3 text-sm">{row.call?.recording_url ? <a className="text-accent" href={row.call.recording_url}>Open recording</a> : "Recording pending"}</div>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-surface">
            <tr>
              {["Name", "Phone", "Location", "Order", "Lang", "Status", "Disposition", "Detected", "Next", "Recording", "Remarks"].map((header) => (
                <th className="border-b border-line px-3 py-2 font-semibold" key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-b border-line" key={String(row.contact_id)}>
                <td className="px-3 py-2">{String(row.provider_name ?? "")}</td>
                <td className="px-3 py-2 font-mono">{String(row.phone ?? "")}</td>
                <td className="px-3 py-2">{String(row.location ?? "")}</td>
                <td className="px-3 py-2">{String(row.order_id ?? "")}</td>
                <td className="px-3 py-2">{String(row.language_hint ?? "")}</td>
                <td className="px-3 py-2">{row.call?.status ?? "not queued"}</td>
                <td className="px-3 py-2">{row.call?.disposition ?? "unknown"}</td>
                <td className="px-3 py-2">{row.call?.detected_language ?? ""}</td>
                <td className="px-3 py-2">{row.call?.next_action ?? "none"}</td>
                <td className="px-3 py-2">{row.call?.recording_url ? <a className="text-accent" href={row.call.recording_url}>link</a> : "none"}</td>
                <td className="max-w-[280px] px-3 py-2">{row.call?.summary_text ?? ""}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-muted" colSpan={11}>Upload contacts to create the first campaign.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function UploadSummaryPanel({ summary }: { summary: UploadSummary }) {
  return (
    <section className="rounded-lg border border-line bg-panel p-4">
      <div className="flex flex-wrap gap-2 text-xs">
        {summary.source_columns.map((column) => (
          <span className="rounded bg-surface px-2 py-1" key={column}>{column}</span>
        ))}
      </div>
      {summary.invalid_rows.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-sm font-semibold">Invalid rows</h3>
          <div className="mt-2 space-y-2">
            {summary.invalid_rows.slice(0, 5).map((row) => (
              <div className="rounded-md border border-line bg-surface p-3 text-sm" key={`invalid-${row.source_row_number}`}>
                <div className="font-medium">Row {row.source_row_number}</div>
                <div className="mt-1 text-muted">{row.errors.join(", ")}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {summary.duplicate_rows.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-sm font-semibold">Duplicate rows</h3>
          <div className="mt-2 space-y-2">
            {summary.duplicate_rows.slice(0, 5).map((row) => (
              <div className="rounded-md border border-line bg-surface p-3 text-sm" key={`duplicate-${row.source_row_number}`}>
                <div className="font-medium">Row {row.source_row_number}</div>
                <div className="mt-1 text-muted">{row.errors.join(", ")}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 break-words">{value}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <section className="rounded-lg border border-dashed border-line bg-panel p-8 text-center">
      <h2 className="text-lg font-semibold">No campaign yet</h2>
      <p className="mt-2 text-sm text-muted">Upload an Excel or CSV contact list to begin the demo workflow.</p>
    </section>
  );
}

function buildManualUploadFile({ phone, language }: { phone: string; language: string }) {
  const csv = [
    "phone,language_hint,provider_name,location,machine_count,order_id",
    [
      escapeCsvValue(phone),
      escapeCsvValue(language),
      escapeCsvValue("Quick check contact"),
      escapeCsvValue("Manual test"),
      "1",
      escapeCsvValue(`MANUAL-${Date.now()}`)
    ].join(",")
  ].join("\n");

  return new File([csv], "manual-number-check.csv", { type: "text/csv" });
}

function escapeCsvValue(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }
  return value;
}
