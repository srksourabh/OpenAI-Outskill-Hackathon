"use client";

import { FormEvent, Fragment, useEffect, useMemo, useState } from "react";

type AgentSettings = {
  voice_preset: "indian_female_natural" | "indian_male_natural" | "openai_custom";
  voice_id: string;
  tone: "polite" | "warm" | "direct" | "patient" | "assertive_respectful";
  prompt_enhancement: string;
  self_improve_enabled: boolean;
};

type Campaign = {
  id: string;
  name: string;
  company_name: string;
  prompt_config: {
    asset_label: string;
    reference_label: string;
    account_label: string;
    account_name: string;
  };
  agent_settings: AgentSettings;
  self_improvement_notes: string;
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
    transcript_text: string;
    transcript_status: string;
    recording_url: string;
    detected_language: string;
    last_call_time: string | null;
    voice_preset_snapshot: string;
    voice_id_snapshot: string;
    tone_snapshot: string;
    prompt_enhancement_snapshot: string;
    receiver_attitude: string;
    improvement_note: string;
    status_history: Array<{ status: string; at: string; note: string }>;
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

const defaultPromptConfig: {
  companyName: string;
  assetLabel: string;
  referenceLabel: string;
  accountLabel: string;
  accountName: string;
} = {
  companyName: "UDS",
  assetLabel: "POS machine",
  referenceLabel: "POS machine number",
  accountLabel: "company/bank",
  accountName: ""
};

const defaultAgentSettings: AgentSettings = {
  voice_preset: "indian_female_natural",
  voice_id: "marin",
  tone: "warm",
  prompt_enhancement: "",
  self_improve_enabled: false
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

  async function saveAgentSettings(campaignId: string, settings: AgentSettings & { default_language: string }) {
    setBusy(true);
    setMessage("Saving agent settings for future calls...");
    const response = await fetch(`/api/campaigns/${campaignId}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings)
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error ?? "Failed to save agent settings");
      return;
    }
    setCampaigns((current) => current.map((campaign) => (campaign.id === data.campaign.id ? data.campaign : campaign)));
    setMessage("Agent settings saved for future calls.");
    await loadResults(data.campaign.id);
  }

  return (
    <main className="min-h-dvh overflow-x-hidden bg-surface text-ink">
      <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-line bg-rail p-5 text-white lg:border-b-0 lg:border-r">
          <div className="text-lg font-semibold">Calling Ops</div>
          <p className="mt-2 text-sm text-white/70">Multilingual outbound AI campaigns</p>
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
              {selected ? <AgentSettingsPanel busy={busy} campaign={selected} onSave={saveAgentSettings} /> : null}
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
  const [manualCompanyName, setManualCompanyName] = useState(defaultPromptConfig.companyName);
  const [manualAssetLabel, setManualAssetLabel] = useState(defaultPromptConfig.assetLabel);
  const [manualReferenceLabel, setManualReferenceLabel] = useState(defaultPromptConfig.referenceLabel);
  const [manualAccountLabel, setManualAccountLabel] = useState(defaultPromptConfig.accountLabel);
  const [manualAccountName, setManualAccountName] = useState(defaultPromptConfig.accountName);

  function submitManualCheck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!manualPhone.trim()) return;

    const formData = new FormData();
    formData.set("campaign_name", "Manual number check");
    formData.set("company_name", manualCompanyName);
    formData.set("asset_label", manualAssetLabel);
    formData.set("reference_label", manualReferenceLabel);
    formData.set("account_label", manualAccountLabel);
    formData.set("account_name", manualAccountName);
    formData.set("voice_preset", defaultAgentSettings.voice_preset);
    formData.set("voice_id", defaultAgentSettings.voice_id);
    formData.set("tone", defaultAgentSettings.tone);
    formData.set("prompt_enhancement", defaultAgentSettings.prompt_enhancement);
    formData.set("self_improve_enabled", String(defaultAgentSettings.self_improve_enabled));
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
          <input className="mt-1 w-full rounded-md border border-line px-3 py-2" name="company_name" defaultValue={defaultPromptConfig.companyName} />
        </label>
        <label className="mt-3 block text-sm font-medium">
          Asset label
          <input className="mt-1 w-full rounded-md border border-line px-3 py-2" name="asset_label" defaultValue={defaultPromptConfig.assetLabel} />
        </label>
        <label className="mt-3 block text-sm font-medium">
          Reference label
          <input className="mt-1 w-full rounded-md border border-line px-3 py-2" name="reference_label" defaultValue={defaultPromptConfig.referenceLabel} />
        </label>
        <label className="mt-3 block text-sm font-medium">
          Account label
          <input className="mt-1 w-full rounded-md border border-line px-3 py-2" name="account_label" defaultValue={defaultPromptConfig.accountLabel} />
        </label>
        <label className="mt-3 block text-sm font-medium">
          Account name
          <input className="mt-1 w-full rounded-md border border-line px-3 py-2" name="account_name" defaultValue={defaultPromptConfig.accountName} placeholder="HDFC Bank, SBI, Pine Labs, etc." />
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
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Voice preset
            <select className="mt-1 w-full rounded-md border border-line px-3 py-2" name="voice_preset" defaultValue={defaultAgentSettings.voice_preset}>
              <option value="indian_female_natural">Indian female natural</option>
              <option value="indian_male_natural">Indian male natural</option>
              <option value="openai_custom">OpenAI custom voice</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            Tone
            <select className="mt-1 w-full rounded-md border border-line px-3 py-2" name="tone" defaultValue={defaultAgentSettings.tone}>
              <option value="warm">Warm</option>
              <option value="polite">Polite</option>
              <option value="direct">Direct</option>
              <option value="patient">Patient</option>
              <option value="assertive_respectful">Assertive but respectful</option>
            </select>
          </label>
        </div>
        <input name="voice_id" type="hidden" value={defaultAgentSettings.voice_id} readOnly />
        <input name="prompt_enhancement" type="hidden" value={defaultAgentSettings.prompt_enhancement} readOnly />
        <input name="self_improve_enabled" type="hidden" value={String(defaultAgentSettings.self_improve_enabled)} readOnly />
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
          Company name
          <input className="mt-1 w-full rounded-md border border-line px-3 py-2" value={manualCompanyName} onChange={(event) => setManualCompanyName(event.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Asset label
          <input className="mt-1 w-full rounded-md border border-line px-3 py-2" value={manualAssetLabel} onChange={(event) => setManualAssetLabel(event.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Reference label
          <input className="mt-1 w-full rounded-md border border-line px-3 py-2" value={manualReferenceLabel} onChange={(event) => setManualReferenceLabel(event.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Account label
          <input className="mt-1 w-full rounded-md border border-line px-3 py-2" value={manualAccountLabel} onChange={(event) => setManualAccountLabel(event.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Account name
          <input
            className="mt-1 w-full rounded-md border border-line px-3 py-2"
            placeholder="Optional bank or company name"
            value={manualAccountName}
            onChange={(event) => setManualAccountName(event.target.value)}
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
          <span className="rounded bg-surface px-2 py-1 text-xs">Voice: {campaign.agent_settings?.voice_preset ?? "indian_female_natural"}</span>
          <span className="rounded bg-surface px-2 py-1 text-xs">Tone: {campaign.agent_settings?.tone ?? "warm"}</span>
          <span className="rounded bg-surface px-2 py-1 text-xs">Self-improve: {campaign.agent_settings?.self_improve_enabled ? "on" : "off"}</span>
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

function AgentSettingsPanel({
  busy,
  campaign,
  onSave
}: {
  busy: boolean;
  campaign: Campaign;
  onSave: (campaignId: string, settings: AgentSettings & { default_language: string }) => void;
}) {
  const settings = campaign.agent_settings ?? defaultAgentSettings;
  const [voicePreset, setVoicePreset] = useState(settings.voice_preset);
  const [voiceId, setVoiceId] = useState(settings.voice_id);
  const [tone, setTone] = useState(settings.tone);
  const [language, setLanguage] = useState(campaign.default_language);
  const [promptEnhancement, setPromptEnhancement] = useState(settings.prompt_enhancement);
  const [selfImprove, setSelfImprove] = useState(settings.self_improve_enabled);

  useEffect(() => {
    const next = campaign.agent_settings ?? defaultAgentSettings;
    setVoicePreset(next.voice_preset);
    setVoiceId(next.voice_id);
    setTone(next.tone);
    setLanguage(campaign.default_language);
    setPromptEnhancement(next.prompt_enhancement);
    setSelfImprove(next.self_improve_enabled);
  }, [campaign.id, campaign.default_language, campaign.agent_settings]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave(campaign.id, {
      default_language: language,
      voice_preset: voicePreset,
      voice_id: voicePreset === "indian_male_natural" ? "cedar" : voicePreset === "indian_female_natural" ? "marin" : voiceId,
      tone,
      prompt_enhancement: promptEnhancement,
      self_improve_enabled: selfImprove
    });
  }

  return (
    <section className="rounded-lg border border-line bg-panel p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Agent settings</h2>
          <p className="text-sm text-muted">Saved changes apply to future calls only.</p>
        </div>
        {campaign.self_improvement_notes ? <div className="max-w-xl text-sm text-muted">{campaign.self_improvement_notes}</div> : null}
      </div>
      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={submit}>
        <label className="block text-sm font-medium">
          Voice preset
          <select className="mt-1 w-full rounded-md border border-line px-3 py-2" value={voicePreset} onChange={(event) => setVoicePreset(event.target.value as AgentSettings["voice_preset"])}>
            <option value="indian_female_natural">Indian female natural</option>
            <option value="indian_male_natural">Indian male natural</option>
            <option value="openai_custom">OpenAI custom voice ID</option>
          </select>
        </label>
        <label className="block text-sm font-medium">
          Default language
          <select className="mt-1 w-full rounded-md border border-line px-3 py-2" value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option value="hi">Hindi</option>
            <option value="en">English</option>
            <option value="bn">Bengali</option>
            <option value="pa">Punjabi</option>
            <option value="gu">Gujarati</option>
            <option value="mr">Marathi</option>
            <option value="ta">Tamil</option>
            <option value="te">Telugu</option>
            <option value="ml">Malayalam</option>
            <option value="kn">Kannada</option>
            <option value="or">Odia</option>
            <option value="as">Assamese</option>
          </select>
        </label>
        {voicePreset === "openai_custom" ? (
          <label className="block text-sm font-medium">
            OpenAI custom voice ID
            <input className="mt-1 w-full rounded-md border border-line px-3 py-2" placeholder="voice_1234" value={voiceId} onChange={(event) => setVoiceId(event.target.value)} />
          </label>
        ) : null}
        <label className="block text-sm font-medium">
          Tone
          <select className="mt-1 w-full rounded-md border border-line px-3 py-2" value={tone} onChange={(event) => setTone(event.target.value as AgentSettings["tone"])}>
            <option value="warm">Warm</option>
            <option value="polite">Polite</option>
            <option value="direct">Direct</option>
            <option value="patient">Patient</option>
            <option value="assertive_respectful">Assertive but respectful</option>
          </select>
        </label>
        <label className="block text-sm font-medium md:col-span-2">
          Prompt enhancement
          <textarea
            className="mt-1 min-h-24 w-full rounded-md border border-line px-3 py-2"
            maxLength={1200}
            placeholder="Extra call guidance appended to the system prompt for future calls."
            value={promptEnhancement}
            onChange={(event) => setPromptEnhancement(event.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input checked={selfImprove} type="checkbox" onChange={(event) => setSelfImprove(event.target.checked)} />
          Self-improve future calls from short call notes
        </label>
        <div className="flex justify-end md:col-span-2">
          <button className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy}>
            Save agent settings
          </button>
        </div>
      </form>
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
              <InfoField label="Attitude" value={row.call?.receiver_attitude ?? "unknown"} />
              <InfoField label="Disposition" value={row.call?.disposition ?? "unknown"} />
              <InfoField label="Next action" value={row.call?.next_action ?? "none"} />
            </div>
            <div className="mt-3 text-sm text-muted">{row.call?.summary_text ?? "No remarks yet."}</div>
            <div className="mt-3 text-sm">{row.call?.recording_url ? <a className="text-accent" href={row.call.recording_url}>Open recording</a> : "Recording pending"}</div>
            {row.call ? <CallHistoryDetails call={row.call} /> : null}
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
              <Fragment key={String(row.contact_id)}>
                <tr className="border-b border-line">
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
                {row.call ? (
                  <tr className="border-b border-line bg-surface/60">
                    <td className="px-3 py-2" colSpan={11}>
                      <CallHistoryDetails call={row.call} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
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

function CallHistoryDetails({ call }: { call: Campaign["calls"][number] }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer font-medium text-accent">Call history and transcript</summary>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <InfoField label="Live status" value={call.status} />
        <InfoField label="Last call" value={call.last_call_time ?? "-"} />
        <InfoField label="Receiver attitude" value={call.receiver_attitude ?? "unknown"} />
        <InfoField label="Voice" value={`${call.voice_preset_snapshot ?? "-"} (${call.voice_id_snapshot ?? "-"})`} />
        <InfoField label="Tone" value={call.tone_snapshot ?? "-"} />
        <InfoField label="Transcript" value={call.transcript_status ?? "missing"} />
      </div>
      {call.prompt_enhancement_snapshot ? (
        <div className="mt-3 rounded-md border border-line bg-panel p-3">
          <div className="text-xs text-muted">Prompt enhancement snapshot</div>
          <div className="mt-1 whitespace-pre-wrap">{call.prompt_enhancement_snapshot}</div>
        </div>
      ) : null}
      <div className="mt-3 rounded-md border border-line bg-panel p-3">
        <div className="text-xs text-muted">Transcript text</div>
        <pre className="mt-1 whitespace-pre-wrap font-sans text-sm">{call.transcript_text || "Transcript pending."}</pre>
      </div>
      <div className="mt-3 rounded-md border border-line bg-panel p-3">
        <div className="text-xs text-muted">Status history</div>
        <ol className="mt-2 space-y-1">
          {(call.status_history ?? []).map((item, index) => (
            <li key={`${item.status}-${item.at}-${index}`}>
              <span className="font-medium">{item.status}</span> <span className="text-muted">{item.at}</span> {item.note ? <span>{item.note}</span> : null}
            </li>
          ))}
        </ol>
      </div>
      {call.improvement_note ? (
        <div className="mt-3 rounded-md border border-line bg-panel p-3">
          <div className="text-xs text-muted">Self-improvement note</div>
          <div className="mt-1">{call.improvement_note}</div>
        </div>
      ) : null}
    </details>
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
