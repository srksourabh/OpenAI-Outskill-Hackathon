"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, Fragment, useEffect, useMemo, useState } from "react";
import { buildPromptStudioPreview } from "@/domain/voice-agent";
import { buildQuickCheckFormData, parsePhoneList, resolveQuickCheckDefaults } from "./quick-check";
import { filterResultRows } from "./results-filter";

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
    receiver_attitude_confidence: number;
    qa_language_status: "pass" | "warn" | "fail";
    qa_tone_status: "pass" | "warn" | "fail";
    qa_score: number;
    qa_notes: string;
    callback_requested_at: string | null;
    callback_remarks: string;
    missed_call_note: string;
    improvement_note: string;
    status_history: Array<{ status: string; at: string; note: string }>;
    retry_eligible: boolean;
  }>;
};

type SessionState = {
  authenticated: boolean;
  role: "admin" | "user" | null;
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

const productName = "eDial";
const selectedCampaignStorageKey = "edial:selected-campaign";
const openAiBuiltInVoices = ["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse", "marin", "cedar"];
const languageOptions = [
  ["hi", "Hindi"],
  ["en", "English"],
  ["bn", "Bengali"],
  ["pa", "Punjabi"],
  ["gu", "Gujarati"],
  ["mr", "Marathi"],
  ["ta", "Tamil"],
  ["te", "Telugu"],
  ["ml", "Malayalam"],
  ["kn", "Kannada"],
  ["or", "Odia"],
  ["as", "Assamese"]
] as const;

const workspaceNavigation = [
  { href: "/campaigns", label: "Overview" },
  { href: "/campaigns/new", label: "New Campaign" },
  { href: "/campaigns/upload", label: "Upload" },
  { href: "/campaigns/results", label: "Results" },
  { href: "/campaigns/settings", label: "Agent Behavior" },
  { href: "/campaigns/exports", label: "Exports" },
  { href: "/health", label: "Health" }
] as const;

function resolveVoiceId(voicePreset: AgentSettings["voice_preset"], voiceId: string) {
  if (voicePreset === "indian_female_natural") return "marin";
  if (voicePreset === "indian_male_natural") return "cedar";
  return voiceId.trim() || "marin";
}

export type CampaignWorkspaceView = "overview" | "new" | "upload" | "results" | "settings" | "exports";

export function CampaignWorkspace({ view }: { view: CampaignWorkspaceView }) {
  const pathname = usePathname();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [results, setResults] = useState<CampaignResults | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [session, setSession] = useState<SessionState>({ authenticated: false, role: null });
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(null);
  const [selectedContactIdsByCampaign, setSelectedContactIdsByCampaign] = useState<Record<string, string[]>>({});

  const selected = useMemo(() => campaigns.find((campaign) => campaign.id === selectedId) ?? campaigns[0], [campaigns, selectedId]);
  const selectedContactIds = selected ? selectedContactIdsByCampaign[selected.id] ?? [] : [];
  const campaignSelection = useMemo(() => selected?.contacts.map((contact) => String(contact.id)) ?? [], [selected]);

  useEffect(() => {
    void loadSession();
    void loadCampaigns();
  }, []);

  useEffect(() => {
    if (selected?.id) void loadResults(selected.id);
  }, [selected?.id]);

  useEffect(() => {
    if (!selected?.id) return;
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(selectedCampaignStorageKey, selected.id);
  }, [selected?.id]);

  const canManage = session.role === "admin";

  async function loadSession() {
    const response = await fetch("/api/auth/session", { cache: "no-store" });
    if (!response.ok) {
      setSession({ authenticated: false, role: null });
      return;
    }
    setSession((await response.json()) as SessionState);
  }

  async function loadCampaigns() {
    const response = await fetch("/api/campaigns", { cache: "no-store" });
    if (!response.ok) {
      setMessage("Please sign in as admin to manage campaigns.");
      return;
    }
    const data = (await response.json()) as { campaigns: Campaign[] };
    setCampaigns(data.campaigns);
    if (!selectedId && data.campaigns[0]) {
      const storedCampaignId = typeof window === "undefined" ? "" : window.sessionStorage.getItem(selectedCampaignStorageKey) ?? "";
      const nextSelection = data.campaigns.find((campaign) => campaign.id === storedCampaignId)?.id ?? data.campaigns[0].id;
      setSelectedId(nextSelection);
    }
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
    selectCampaign(data.campaign.id);
  }

  async function startCampaign(contactIds?: string[]) {
    if (!selected) return;
    if (!canManage) {
      setMessage("Only admin users can run campaign actions.");
      return;
    }
    setBusy(true);
    setMessage(contactIds?.length ? `Starting ${contactIds.length} selected contact${contactIds.length === 1 ? "" : "s"}...` : "Starting campaign...");
    const response = await fetch(`/api/campaigns/${selected.id}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contactIds?.length ? { contact_ids: contactIds } : {})
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error ?? "Action failed");
      return;
    }
    setCampaigns((current) => current.map((campaign) => (campaign.id === data.campaign.id ? data.campaign : campaign)));
    setSelectedContactIdsByCampaign((current) => ({ ...current, [data.campaign.id]: [] }));
    setMessage(contactIds?.length ? "Selected contacts started." : "Campaign updated.");
    await loadResults(data.campaign.id);
  }

  async function saveAgentSettings(campaignId: string, settings: AgentSettings & { default_language: string }) {
    if (!canManage) {
      setMessage("Only admin users can save agent settings.");
      return;
    }
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

  async function createCampaign(input: {
    name: string;
    company_name: string;
    default_language: string;
    concurrency_limit: number;
    provider: "simulated" | "plivo";
    prompt_config: Campaign["prompt_config"];
    agent_settings: AgentSettings;
  }) {
    if (!canManage) {
      setMessage("Only admin users can create campaign drafts.");
      return;
    }

    setBusy(true);
    const response = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, contacts: [] })
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error ?? "Failed to create campaign.");
      return;
    }
    setCampaigns((current) => [data.campaign as Campaign, ...current]);
    selectCampaign((data.campaign as Campaign).id);
    setMessage("Campaign draft created. Add contacts with quick check or file upload.");
  }

  function selectCampaign(campaignId: string) {
    setSelectedId(campaignId);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(selectedCampaignStorageKey, campaignId);
    }
  }

  function toggleContactSelection(contactId: string) {
    if (!selected) return;
    setSelectedContactIdsByCampaign((current) => {
      const existing = current[selected.id] ?? [];
      const next = existing.includes(contactId) ? existing.filter((id) => id !== contactId) : [...existing, contactId];
      return { ...current, [selected.id]: next };
    });
  }

  function toggleAllVisibleContacts(contactIds: string[]) {
    if (!selected) return;
    setSelectedContactIdsByCampaign((current) => {
      const existing = current[selected.id] ?? [];
      const everyVisibleSelected = contactIds.every((contactId) => existing.includes(contactId));
      const next = everyVisibleSelected ? existing.filter((contactId) => !contactIds.includes(contactId)) : Array.from(new Set([...existing, ...contactIds]));
      return { ...current, [selected.id]: next };
    });
  }

  function downloadTranscript(call: Campaign["calls"][number]) {
    if (!call.transcript_text || typeof window === "undefined") return;
    const blob = new Blob([call.transcript_text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `transcript-${call.id}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const header = getWorkspaceHeader(view);

  return (
    <main className="min-h-dvh overflow-x-hidden bg-surface pb-20 text-white lg:pb-0">
      <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-white/50 bg-panel p-5 text-ink lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto lg:border-b-0 lg:border-r-4 lg:border-accent">
          <div className="text-xs font-black uppercase tracking-wide text-surface">Autonomous Calling Agent</div>
          <div className="mt-2 text-2xl font-black">{productName}</div>
          <p className="mt-2 text-sm text-muted">Multilingual outbound AI campaigns with synced agent controls and callback tracking.</p>
          <div className="mt-4 rounded-md bg-accent px-3 py-2 text-xs font-bold">
            Signed in as: <span className="font-semibold uppercase">{session.role ?? "guest"}</span>
          </div>
          <nav className="mt-8 space-y-2 text-sm">
            {workspaceNavigation.map((item) => (
              <TopNavLink key={item.href} href={item.href} label={item.label} pathname={pathname} />
            ))}
          </nav>
        </aside>

        <section className="min-w-0 p-4 sm:p-6">
          <header className="flex flex-col gap-4 border-b border-white/50 pb-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-accent">Live operations workspace</p>
              <h1 className="mt-2 text-5xl font-black leading-tight text-accent">{header.title}</h1>
              <p className="mt-2 text-base text-white">{header.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canManage && view === "results" ? (
                <button
                  className="rounded-md bg-accent px-4 py-2 text-sm font-black text-ink disabled:opacity-50"
                  disabled={!selected || busy || campaignSelection.length === 0}
                  onClick={() => void startCampaign(selectedContactIds.length ? selectedContactIds : campaignSelection)}
                >
                  {selectedContactIds.length ? `Start ${selectedContactIds.length} selected` : "Start listed contacts"}
                </button>
              ) : null}
              {selected && view !== "exports" ? (
                <a className="rounded-md bg-white px-4 py-2 text-sm font-black text-ink" href={`/api/campaigns/${selected.id}/export`}>
                  Export CSV
                </a>
              ) : null}
              {selected && view !== "exports" ? (
                <a className="rounded-md border-2 border-white px-4 py-2 text-sm font-black text-white" href={`/api/campaigns/${selected.id}/export?format=html`}>
                  Export HTML
                </a>
              ) : null}
            </div>
          </header>

          <div className="mt-5 space-y-5">
            {message ? <div className="rounded-md bg-white px-4 py-3 text-sm font-semibold text-ink">{message}</div> : null}
            <CampaignSelector campaigns={campaigns} selectedId={selected?.id ?? ""} onSelect={selectCampaign} />
            {view === "overview" ? <StartHerePanel canManage={canManage} selected={selected} /> : null}
            {uploadSummary && view === "upload" ? <UploadSummaryPanel summary={uploadSummary} /> : null}
            {selected ? <MetricBand campaign={selected} stats={results?.stats ?? {}} /> : <EmptyState />}
            {view === "new" ? <CreateCampaignPanel busy={busy} defaults={selected} canManage={canManage} onCreate={createCampaign} /> : null}
            {view === "upload" ? <UploadPanel busy={busy} canManage={canManage} campaignDefaults={selected} onUpload={uploadFile} /> : null}
            {view === "settings" && selected ? <AgentSettingsPanel busy={busy} canManage={canManage} campaign={selected} onSave={saveAgentSettings} /> : null}
            {view === "settings" && selected ? <PromptStudioPanel busy={busy} canManage={canManage} campaign={selected} onSave={saveAgentSettings} /> : null}
            {view === "exports" && selected ? <DownloadsPanel campaign={selected} /> : null}
            {view === "results" && selected ? (
              <ResultsTable
                rows={results?.rows ?? []}
                canManage={canManage}
                selectedContactIds={selectedContactIds}
                onToggleContact={toggleContactSelection}
                onToggleAll={toggleAllVisibleContacts}
                onDownloadTranscript={downloadTranscript}
                onStartSelected={() => void startCampaign(selectedContactIds.length ? selectedContactIds : campaignSelection)}
                busy={busy}
              />
            ) : null}
          </div>
        </section>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t-2 border-accent bg-panel text-center text-xs font-black text-ink shadow-2xl lg:hidden">
        {workspaceNavigation.slice(0, 5).map((item) => (
          <Link className={`px-2 py-3 ${pathname === item.href ? "bg-accent" : ""}`} href={item.href} key={item.href}>
            {item.label.replace(" Campaign", "")}
          </Link>
        ))}
      </nav>
    </main>
  );
}

function TopNavLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = pathname === href;
  return (
    <Link className={`block rounded-md px-3 py-2 ${active ? "bg-surface font-black text-white" : "font-semibold text-ink hover:bg-accent"}`} href={href}>
      {label}
    </Link>
  );
}

function getWorkspaceHeader(view: CampaignWorkspaceView) {
  if (view === "new") {
    return {
      title: `${productName} New Campaign`,
      description: "Create a fresh campaign shell first, then move to upload or results when you are ready to run it."
    };
  }
  if (view === "upload") {
    return {
      title: `${productName} Upload Workspace`,
      description: "Upload CSV or Excel files, or create a quick single-number / list-based campaign without touching a database-heavy flow."
    };
  }
  if (view === "settings") {
    return {
      title: `${productName} Agent Behavior`,
      description: "Change the agent voice, tone, language, and saved prompt behavior, then keep those settings for future calls."
    };
  }
  if (view === "results") {
    return {
      title: `${productName} Live Results`,
      description: "See uploaded rows inside the UI, select a few contacts, start the campaign, and watch status and transcript evidence update clearly."
    };
  }
  if (view === "exports") {
    return {
      title: `${productName} Exports`,
      description: "Download campaign outputs instantly for operators, with transcript-ready result files and minimal backend dependency."
    };
  }
  return {
    title: `${productName} Command Center`,
    description: "Use the left navigation to move through campaign setup, upload, live results, agent behavior, and exports as separate pages."
  };
}

function UploadPanel({
  busy,
  canManage,
  campaignDefaults,
  onUpload
}: {
  busy: boolean;
  canManage: boolean;
  campaignDefaults?: Campaign;
  onUpload: (formData: FormData) => void;
}) {
  const quickCheckDefaults = useMemo(() => resolveQuickCheckDefaults(campaignDefaults), [campaignDefaults]);
  const [intakeMode, setIntakeMode] = useState<"single" | "list" | "file">("single");
  const [manualCampaignName, setManualCampaignName] = useState("Manual number check");
  const [fileCampaignName, setFileCampaignName] = useState("Hindi pickup readiness demo");
  const [manualPhone, setManualPhone] = useState("");
  const [manualPhoneList, setManualPhoneList] = useState("");
  const [manualLanguage, setManualLanguage] = useState(quickCheckDefaults.language);
  const [manualProvider, setManualProvider] = useState(quickCheckDefaults.provider);
  const [manualCompanyName, setManualCompanyName] = useState(quickCheckDefaults.companyName);
  const [manualAssetLabel, setManualAssetLabel] = useState(quickCheckDefaults.promptConfig.asset_label);
  const [manualReferenceLabel, setManualReferenceLabel] = useState(quickCheckDefaults.promptConfig.reference_label);
  const [manualAccountLabel, setManualAccountLabel] = useState(quickCheckDefaults.promptConfig.account_label);
  const [manualAccountName, setManualAccountName] = useState(quickCheckDefaults.promptConfig.account_name);
  const [manualVoicePreset, setManualVoicePreset] = useState<AgentSettings["voice_preset"]>(quickCheckDefaults.agentSettings.voice_preset);
  const [manualVoiceId, setManualVoiceId] = useState(quickCheckDefaults.agentSettings.voice_id);
  const [manualTone, setManualTone] = useState<AgentSettings["tone"]>(quickCheckDefaults.agentSettings.tone);
  const [manualPromptEnhancement, setManualPromptEnhancement] = useState(quickCheckDefaults.agentSettings.prompt_enhancement);
  const [manualSelfImprove, setManualSelfImprove] = useState(quickCheckDefaults.agentSettings.self_improve_enabled);
  const [manualConcurrency, setManualConcurrency] = useState(5);

  useEffect(() => {
    setManualLanguage(quickCheckDefaults.language);
    setManualProvider(quickCheckDefaults.provider);
    setManualCompanyName(quickCheckDefaults.companyName);
    setManualAssetLabel(quickCheckDefaults.promptConfig.asset_label);
    setManualReferenceLabel(quickCheckDefaults.promptConfig.reference_label);
    setManualAccountLabel(quickCheckDefaults.promptConfig.account_label);
    setManualAccountName(quickCheckDefaults.promptConfig.account_name);
    setManualVoicePreset(quickCheckDefaults.agentSettings.voice_preset);
    setManualVoiceId(quickCheckDefaults.agentSettings.voice_id);
    setManualTone(quickCheckDefaults.agentSettings.tone);
    setManualPromptEnhancement(quickCheckDefaults.agentSettings.prompt_enhancement);
    setManualSelfImprove(quickCheckDefaults.agentSettings.self_improve_enabled);
    setManualConcurrency(5);
  }, [quickCheckDefaults]);

  function submitManualCheck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    const phones = intakeMode === "single" ? [manualPhone.trim()] : parsePhoneList(manualPhoneList);
    if (phones.length === 0) return;

    onUpload(
      buildQuickCheckFormData({
        campaignName: manualCampaignName,
        phone: phones[0],
        phones,
        language: manualLanguage,
        provider: manualProvider,
        concurrencyLimit: manualConcurrency,
        companyName: manualCompanyName,
        promptConfig: {
          asset_label: manualAssetLabel,
          reference_label: manualReferenceLabel,
          account_label: manualAccountLabel,
          account_name: manualAccountName
        },
        agentSettings: {
          voice_preset: manualVoicePreset,
          voice_id: resolveVoiceId(manualVoicePreset, manualVoiceId),
          tone: manualTone,
          prompt_enhancement: manualPromptEnhancement,
          self_improve_enabled: manualSelfImprove
        }
      })
    );
  }

  return (
    <section className="rounded-2xl bg-panel p-5 text-ink" id="upload">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-surface">Upload</p>
        <h2 className="mt-1 text-2xl font-black">Intake and agent setup</h2>
        <p className="mt-1 text-sm text-muted">Use one number, a list of numbers, or spreadsheet upload. Prompt text lives in Prompt Studio so there is one place to edit it.</p>
        <a className="mt-3 inline-flex rounded-md bg-accent px-3 py-2 text-sm font-black text-ink" href="/sample-mobile-upload.csv" download>
          Download sample upload file
        </a>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 rounded-md border-2 border-surface p-1 text-sm">
        <button
          className={`rounded px-2 py-2 font-black ${intakeMode === "single" ? "bg-surface text-white" : "text-muted"}`}
          type="button"
          onClick={() => setIntakeMode("single")}
        >
          Single number
        </button>
        <button
          className={`rounded px-2 py-2 font-black ${intakeMode === "list" ? "bg-surface text-white" : "text-muted"}`}
          type="button"
          onClick={() => setIntakeMode("list")}
        >
          Number list
        </button>
        <button
          className={`rounded px-2 py-2 font-black ${intakeMode === "file" ? "bg-surface text-white" : "text-muted"}`}
          type="button"
          onClick={() => setIntakeMode("file")}
        >
          CSV/XLSX upload
        </button>
      </div>

      {intakeMode === "file" ? (
        <form
          className="mt-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);
            formData.set("voice_id", resolveVoiceId(manualVoicePreset, manualVoiceId));
            if (!canManage) return;
            onUpload(formData);
          }}
        >
          <label className="block text-sm font-medium">
            Campaign name
            <input className="mt-1 w-full rounded-md border border-line px-3 py-2" name="campaign_name" value={fileCampaignName} onChange={(event) => setFileCampaignName(event.target.value)} />
          </label>
          <label className="mt-3 block text-sm font-medium">
            Company name
            <input className="mt-1 w-full rounded-md border border-line px-3 py-2" name="company_name" value={manualCompanyName} onChange={(event) => setManualCompanyName(event.target.value)} />
          </label>
          <label className="mt-3 block text-sm font-medium">
            Asset label
            <input className="mt-1 w-full rounded-md border border-line px-3 py-2" name="asset_label" value={manualAssetLabel} onChange={(event) => setManualAssetLabel(event.target.value)} />
          </label>
          <label className="mt-3 block text-sm font-medium">
            Reference label
            <input className="mt-1 w-full rounded-md border border-line px-3 py-2" name="reference_label" value={manualReferenceLabel} onChange={(event) => setManualReferenceLabel(event.target.value)} />
          </label>
          <label className="mt-3 block text-sm font-medium">
            Account label
            <input className="mt-1 w-full rounded-md border border-line px-3 py-2" name="account_label" value={manualAccountLabel} onChange={(event) => setManualAccountLabel(event.target.value)} />
          </label>
          <label className="mt-3 block text-sm font-medium">
            Account name
            <input
              className="mt-1 w-full rounded-md border border-line px-3 py-2"
              name="account_name"
              placeholder="HDFC Bank, SBI, Pine Labs, etc."
              value={manualAccountName}
              onChange={(event) => setManualAccountName(event.target.value)}
            />
          </label>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Calling mode
              <select className="mt-1 w-full rounded-md border-2 border-surface px-3 py-2" name="provider" value={manualProvider} onChange={(event) => setManualProvider(event.target.value)}>
                <option value="simulated">Instant demo run</option>
                <option value="plivo">Plivo live call</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Default language
              <select className="mt-1 w-full rounded-md border border-line px-3 py-2" name="default_language" value={manualLanguage} onChange={(event) => setManualLanguage(event.target.value)}>
                {languageOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-3 rounded-2xl border-2 border-surface p-3">
            <h3 className="text-sm font-semibold">Agent options (mirrors Agent Settings)</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Voice preset
                <select
                  className="mt-1 w-full rounded-md border border-line px-3 py-2"
                  name="voice_preset"
                  value={manualVoicePreset}
                  onChange={(event) => setManualVoicePreset(event.target.value as AgentSettings["voice_preset"])}
                >
                  <option value="indian_female_natural">Indian female natural</option>
                  <option value="indian_male_natural">Indian male natural</option>
                  <option value="openai_custom">OpenAI custom voice</option>
                </select>
              </label>
              <label className="block text-sm font-medium">
                Tone
                <select className="mt-1 w-full rounded-md border border-line px-3 py-2" name="tone" value={manualTone} onChange={(event) => setManualTone(event.target.value as AgentSettings["tone"])}>
                  <option value="warm">Warm</option>
                  <option value="polite">Polite</option>
                  <option value="direct">Direct</option>
                  <option value="patient">Patient</option>
                  <option value="assertive_respectful">Assertive but respectful</option>
                </select>
              </label>
            </div>
            {manualVoicePreset === "openai_custom" ? (
              <label className="mt-3 block text-sm font-medium">
                OpenAI custom voice ID
                <input className="mt-1 w-full rounded-md border border-line px-3 py-2" placeholder="voice_1234" value={manualVoiceId} onChange={(event) => setManualVoiceId(event.target.value)} />
              </label>
            ) : null}
            <p className="mt-2 text-xs text-muted">Built-in IDs you can use: {openAiBuiltInVoices.join(", ")}. Use Prompt Studio after creation for script guidance.</p>
            <label className="mt-3 flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={manualSelfImprove} onChange={(event) => setManualSelfImprove(event.target.checked)} />
              Self-improve future calls from short call notes
            </label>
          </div>
          <input name="voice_id" type="hidden" value={resolveVoiceId(manualVoicePreset, manualVoiceId)} readOnly />
          <input name="prompt_enhancement" type="hidden" value={manualPromptEnhancement} readOnly />
          <input name="self_improve_enabled" type="hidden" value={String(manualSelfImprove)} readOnly />
          <label className="mt-3 block text-sm font-medium">
            Concurrency limit
            <input
              className="mt-1 w-full rounded-md border border-line px-3 py-2"
              min={1}
              max={25}
              name="concurrency_limit"
              type="number"
              value={manualConcurrency}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                setManualConcurrency(Number.isFinite(nextValue) ? nextValue : 1);
              }}
            />
          </label>
          <label className="mt-3 block text-sm font-medium">
            Contact file
            <input className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2" name="file" type="file" accept=".csv,.xlsx" required />
          </label>
          <button className="mt-4 w-full rounded-md bg-accent px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={busy || !canManage}>
            Upload and validate
          </button>
        </form>
      ) : (
        <form className="mt-4 space-y-3" onSubmit={submitManualCheck}>
          <div>
            <h3 className="text-base font-semibold">{intakeMode === "single" ? "Single number intake" : "Number-list intake"}</h3>
            <p className="mt-1 text-sm text-muted">
              {intakeMode === "single"
                ? "Create a one-contact live campaign without preparing a spreadsheet."
                : "Paste multiple numbers separated by new lines, commas, or semicolons."}
            </p>
          </div>
          <label className="block text-sm font-medium">
            Campaign name
            <input className="mt-1 w-full rounded-md border border-line px-3 py-2" value={manualCampaignName} onChange={(event) => setManualCampaignName(event.target.value)} />
          </label>
          {intakeMode === "single" ? (
            <label className="block text-sm font-medium">
              Mobile number
              <input
                className="mt-1 w-full rounded-md border border-line px-3 py-2"
                placeholder="+919876543210 or 9876543210"
                value={manualPhone}
                onChange={(event) => setManualPhone(event.target.value)}
              />
            </label>
          ) : (
            <label className="block text-sm font-medium">
              Mobile numbers
              <textarea
                className="mt-1 min-h-28 w-full rounded-md border border-line px-3 py-2"
                placeholder={"+919876543210\n9876543211\n9876543212"}
                value={manualPhoneList}
                onChange={(event) => setManualPhoneList(event.target.value)}
              />
            </label>
          )}
          <label className="block text-sm font-medium">
            Company name
            <input className="mt-1 w-full rounded-md border border-line px-3 py-2" value={manualCompanyName} onChange={(event) => setManualCompanyName(event.target.value)} />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Asset label
              <input className="mt-1 w-full rounded-md border border-line px-3 py-2" value={manualAssetLabel} onChange={(event) => setManualAssetLabel(event.target.value)} />
            </label>
            <label className="block text-sm font-medium">
              Reference label
              <input className="mt-1 w-full rounded-md border border-line px-3 py-2" value={manualReferenceLabel} onChange={(event) => setManualReferenceLabel(event.target.value)} />
            </label>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Calling mode
              <select className="mt-1 w-full rounded-md border border-line px-3 py-2" value={manualProvider} onChange={(event) => setManualProvider(event.target.value)}>
                <option value="simulated">Instant demo run</option>
                <option value="plivo">Plivo live call</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Preferred language
              <select className="mt-1 w-full rounded-md border border-line px-3 py-2" value={manualLanguage} onChange={(event) => setManualLanguage(event.target.value)}>
                {languageOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="rounded-md border border-line bg-surface p-3">
            <h3 className="text-sm font-semibold">Agent options (mirrors Agent Settings)</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Voice preset
                <select className="mt-1 w-full rounded-md border border-line px-3 py-2" value={manualVoicePreset} onChange={(event) => setManualVoicePreset(event.target.value as AgentSettings["voice_preset"])}>
                  <option value="indian_female_natural">Indian female natural</option>
                  <option value="indian_male_natural">Indian male natural</option>
                  <option value="openai_custom">OpenAI custom voice</option>
                </select>
              </label>
              <label className="block text-sm font-medium">
                Tone
                <select className="mt-1 w-full rounded-md border border-line px-3 py-2" value={manualTone} onChange={(event) => setManualTone(event.target.value as AgentSettings["tone"])}>
                  <option value="warm">Warm</option>
                  <option value="polite">Polite</option>
                  <option value="direct">Direct</option>
                  <option value="patient">Patient</option>
                  <option value="assertive_respectful">Assertive but respectful</option>
                </select>
              </label>
            </div>
            {manualVoicePreset === "openai_custom" ? (
              <label className="mt-3 block text-sm font-medium">
                OpenAI custom voice ID
                <input className="mt-1 w-full rounded-md border border-line px-3 py-2" placeholder="voice_1234" value={manualVoiceId} onChange={(event) => setManualVoiceId(event.target.value)} />
              </label>
            ) : null}
            <p className="mt-2 text-xs text-muted">Built-in IDs you can use: {openAiBuiltInVoices.join(", ")}. Use Prompt Studio after creation for script guidance.</p>
            <label className="mt-3 flex items-center gap-2 text-sm font-medium">
              <input checked={manualSelfImprove} type="checkbox" onChange={(event) => setManualSelfImprove(event.target.checked)} />
              Self-improve future calls from short call notes
            </label>
          </div>
          <label className="block text-sm font-medium">
            Concurrency limit
            <input
              className="mt-1 w-full rounded-md border border-line px-3 py-2"
              min={1}
              max={25}
              type="number"
              value={manualConcurrency}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                setManualConcurrency(Number.isFinite(nextValue) ? nextValue : 1);
              }}
            />
          </label>
          <button
            className="w-full rounded-md border border-line bg-panel px-4 py-2 font-semibold disabled:opacity-50"
            disabled={
              busy || (intakeMode === "single" ? !manualPhone.trim() : parsePhoneList(manualPhoneList).length === 0)
                || !canManage
            }
          >
            {intakeMode === "single" ? "Create single-number campaign" : "Create number-list campaign"}
          </button>
          {!canManage ? <p className="text-xs text-muted">Sign in as admin to create campaigns and upload contacts.</p> : null}
        </form>
      )}
    </section>
  );
}

function StartHerePanel({ canManage, selected }: { canManage: boolean; selected?: Campaign }) {
  const steps = canManage
    ? [
        ["1", "Create or choose a campaign", selected ? `Selected: ${selected.name}` : "Use New Campaign if you are starting fresh."],
        ["2", "Add contacts", "Use quick single-number intake, paste a list, or upload CSV/XLSX."],
        ["3", "Start and review", "Run bounded simultaneous calls, then inspect sentiment, QA, callback notes, and exports."]
      ]
    : [
        ["1", "Choose an existing campaign", selected ? `Selected: ${selected.name}` : "Ask an admin to create a campaign first."],
        ["2", "Review outcomes", "Open Results to inspect call status, sentiment, transcript, and callback notes."],
        ["3", "Download exports", "Use Exports for operations handoff files when campaign data is ready."]
      ];

  return (
    <section className="scroll-mt-6 rounded-2xl bg-accent p-5 text-ink" id="start">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-surface">Start here</p>
          <h2 className="mt-1 text-3xl font-black">{canManage ? "Run the demo from left to right" : "Review the campaign workspace"}</h2>
          <p className="mt-1 max-w-3xl text-sm font-semibold">
            {canManage
              ? "This page is the product workspace. Begin with a campaign, add contacts, start simultaneous calls, then review sentiment and exports."
              : "User access is read-only, so start with campaign results and exports after an admin creates or starts a campaign."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage ? <Link className="rounded-md bg-surface px-3 py-2 text-sm font-black text-white" href="/campaigns/new">New campaign</Link> : null}
          <Link className="rounded-md border-2 border-surface px-3 py-2 text-sm font-black text-ink" href={canManage ? "/campaigns/upload" : "/campaigns/results"}>
            {canManage ? "Add contacts" : "Open results"}
          </Link>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {steps.map(([number, title, body]) => (
          <article className="rounded-md bg-white p-4" key={title}>
            <div className="text-xs font-black uppercase text-surface">Step {number}</div>
            <h3 className="mt-1 text-lg font-black">{title}</h3>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function CreateCampaignPanel({
  busy,
  defaults,
  canManage,
  onCreate
}: {
  busy: boolean;
  defaults?: Campaign;
  canManage: boolean;
  onCreate: (input: {
    name: string;
    company_name: string;
    default_language: string;
    concurrency_limit: number;
    provider: "simulated" | "plivo";
    prompt_config: Campaign["prompt_config"];
    agent_settings: AgentSettings;
  }) => void;
}) {
  const [name, setName] = useState("New readiness campaign");
  const [company, setCompany] = useState(defaults?.company_name ?? "UDS");
  const [language, setLanguage] = useState(defaults?.default_language ?? "hi");
  const [provider, setProvider] = useState<"simulated" | "plivo">(defaults?.provider === "plivo" ? "plivo" : "simulated");
  const [concurrency, setConcurrency] = useState(defaults?.concurrency_limit ?? 5);
  const [assetLabel, setAssetLabel] = useState(defaults?.prompt_config.asset_label ?? "POS machine");
  const [referenceLabel, setReferenceLabel] = useState(defaults?.prompt_config.reference_label ?? "POS machine number");
  const [accountLabel, setAccountLabel] = useState(defaults?.prompt_config.account_label ?? "company/bank");
  const [accountName, setAccountName] = useState(defaults?.prompt_config.account_name ?? "");
  const [tone, setTone] = useState<AgentSettings["tone"]>(defaults?.agent_settings?.tone ?? "warm");

  useEffect(() => {
    if (!defaults) return;
    setCompany(defaults.company_name);
    setLanguage(defaults.default_language);
    setProvider(defaults.provider === "plivo" ? "plivo" : "simulated");
    setConcurrency(defaults.concurrency_limit);
    setAssetLabel(defaults.prompt_config.asset_label);
    setReferenceLabel(defaults.prompt_config.reference_label);
    setAccountLabel(defaults.prompt_config.account_label);
    setAccountName(defaults.prompt_config.account_name);
    setTone(defaults.agent_settings?.tone ?? "warm");
  }, [defaults?.id]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreate({
      name,
      company_name: company,
      default_language: language,
      provider,
      concurrency_limit: Math.max(1, Math.min(25, concurrency)),
      prompt_config: {
        asset_label: assetLabel,
        reference_label: referenceLabel,
        account_label: accountLabel,
        account_name: accountName
      },
      agent_settings: {
        voice_preset: defaults?.agent_settings?.voice_preset ?? "indian_female_natural",
        voice_id: defaults?.agent_settings?.voice_id ?? "marin",
        tone,
        prompt_enhancement: defaults?.agent_settings?.prompt_enhancement ?? "",
        self_improve_enabled: defaults?.agent_settings?.self_improve_enabled ?? false
      }
    });
  }

  return (
    <section className="scroll-mt-6 rounded-2xl bg-panel p-5 text-ink" id="new-campaign">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-surface">Campaign draft</p>
          <h2 className="mt-1 text-2xl font-black">Create Campaign</h2>
          <p className="text-sm text-muted">Create a campaign draft with agent defaults, then connect contacts using quick check or spreadsheet upload.</p>
        </div>
        <span className="rounded-md bg-accent px-2 py-1 text-xs font-black">Connected to intake, prompt studio, and exports</span>
      </div>
      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={submit}>
        <label className="text-sm font-medium">
          Campaign name
          <input className="mt-1 w-full rounded-md border border-line px-3 py-2" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="text-sm font-medium">
          Company name
          <input className="mt-1 w-full rounded-md border border-line px-3 py-2" value={company} onChange={(event) => setCompany(event.target.value)} />
        </label>
        <label className="text-sm font-medium">
          Default language
          <select className="mt-1 w-full rounded-md border border-line px-3 py-2" value={language} onChange={(event) => setLanguage(event.target.value)}>
            {languageOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Provider
          <select className="mt-1 w-full rounded-md border border-line px-3 py-2" value={provider} onChange={(event) => setProvider(event.target.value as "simulated" | "plivo")}>
            <option value="simulated">Instant demo run</option>
            <option value="plivo">Plivo live call</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Concurrency limit
          <input
            className="mt-1 w-full rounded-md border border-line px-3 py-2"
            min={1}
            max={25}
            type="number"
            value={concurrency}
            onChange={(event) => setConcurrency(Number(event.target.value) || 1)}
          />
        </label>
        <label className="text-sm font-medium">
          Tone
          <select className="mt-1 w-full rounded-md border border-line px-3 py-2" value={tone} onChange={(event) => setTone(event.target.value as AgentSettings["tone"])}>
            <option value="warm">Warm</option>
            <option value="polite">Polite</option>
            <option value="direct">Direct</option>
            <option value="patient">Patient</option>
            <option value="assertive_respectful">Assertive but respectful</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Asset label
          <input className="mt-1 w-full rounded-md border border-line px-3 py-2" value={assetLabel} onChange={(event) => setAssetLabel(event.target.value)} />
        </label>
        <label className="text-sm font-medium">
          Reference label
          <input className="mt-1 w-full rounded-md border border-line px-3 py-2" value={referenceLabel} onChange={(event) => setReferenceLabel(event.target.value)} />
        </label>
        <label className="text-sm font-medium">
          Account label
          <input className="mt-1 w-full rounded-md border border-line px-3 py-2" value={accountLabel} onChange={(event) => setAccountLabel(event.target.value)} />
        </label>
        <label className="text-sm font-medium md:col-span-2">
          Account name
          <input className="mt-1 w-full rounded-md border border-line px-3 py-2" value={accountName} onChange={(event) => setAccountName(event.target.value)} />
        </label>
        <div className="md:col-span-2">
          <button className="rounded-md bg-accent px-4 py-2 text-sm font-black text-ink disabled:opacity-50" disabled={busy || !canManage}>
            Create campaign draft
          </button>
          {!canManage ? <p className="mt-2 text-xs text-muted">Sign in as admin to create and manage campaigns.</p> : null}
        </div>
      </form>
    </section>
  );
}

function CampaignSelector({ campaigns, selectedId, onSelect }: { campaigns: Campaign[]; selectedId: string; onSelect: (id: string) => void }) {
  if (campaigns.length === 0) return null;
  return (
    <label className="block rounded-2xl bg-panel p-5 text-sm font-bold text-ink">
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
    <section className="scroll-mt-6 rounded-2xl bg-panel text-ink" id="overview">
      <div className="border-b-2 border-line p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-black">{campaign.name}</h2>
          <span className="rounded-md bg-accent px-2 py-1 text-xs font-black">{campaign.status}</span>
          <span className="rounded-md border-2 border-line px-2 py-1 text-xs font-bold">Default: {campaign.default_language}</span>
          <span className="rounded-md border-2 border-line px-2 py-1 text-xs font-bold">Concurrency: {campaign.concurrency_limit}</span>
          <span className="rounded-md border-2 border-line px-2 py-1 text-xs font-bold">Voice: {campaign.agent_settings?.voice_preset ?? "indian_female_natural"}</span>
          <span className="rounded-md border-2 border-line px-2 py-1 text-xs font-bold">Tone: {campaign.agent_settings?.tone ?? "warm"}</span>
          <span className="rounded-md border-2 border-line px-2 py-1 text-xs font-bold">Self-improve: {campaign.agent_settings?.self_improve_enabled ? "on" : "off"}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8">
        {metrics.map(([label, value]) => (
          <div className="border-b border-r border-line p-3" key={label}>
            <div className="text-xs text-muted">{label}</div>
            <div className="mt-1 text-3xl font-black tabular-nums">{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PromptStudioPanel({
  busy,
  canManage,
  campaign,
  onSave
}: {
  busy: boolean;
  canManage: boolean;
  campaign: Campaign;
  onSave: (campaignId: string, settings: AgentSettings & { default_language: string }) => void;
}) {
  const settings = campaign.agent_settings ?? defaultAgentSettings;
  const [promptEnhancement, setPromptEnhancement] = useState(settings.prompt_enhancement);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setPromptEnhancement((campaign.agent_settings ?? defaultAgentSettings).prompt_enhancement);
    setCopied(false);
  }, [campaign.id, campaign.agent_settings]);

  const blendedPromptPreview = useMemo(
    () =>
      buildPromptStudioPreview({
        companyName: campaign.company_name,
        defaultLanguage: campaign.default_language,
        promptConfig: campaign.prompt_config,
        agentSettings: {
          ...campaign.agent_settings,
          prompt_enhancement: promptEnhancement
        },
        selfImprovementNotes: campaign.self_improvement_notes
      }),
    [campaign.company_name, campaign.default_language, campaign.prompt_config, campaign.agent_settings, campaign.self_improvement_notes, promptEnhancement]
  );

  async function copyPreview() {
    await navigator.clipboard.writeText(blendedPromptPreview);
    setCopied(true);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    onSave(campaign.id, {
      default_language: campaign.default_language,
      voice_preset: settings.voice_preset,
      voice_id: settings.voice_id,
      tone: settings.tone,
      prompt_enhancement: promptEnhancement,
      self_improve_enabled: settings.self_improve_enabled
    });
  }

  return (
    <section className="scroll-mt-6 rounded-2xl bg-panel p-5 text-ink" id="prompt-studio">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-surface">Prompt Studio</p>
          <h2 className="mt-1 text-2xl font-black">Prompt Studio</h2>
          <p className="text-sm text-muted">Edit your operator prompt and preview the blended system prompt for future calls.</p>
        </div>
        <button className="rounded-md bg-accent px-3 py-2 text-sm font-black text-ink disabled:opacity-50" disabled={busy} onClick={copyPreview} type="button">
          {copied ? "Copied" : "Copy preview"}
        </button>
      </div>
      <form className="mt-4 space-y-3" onSubmit={submit}>
        <label className="block text-sm font-medium">
          Prompt window
          <textarea
            className="mt-1 min-h-28 w-full rounded-md border border-line px-3 py-2"
            maxLength={1200}
            placeholder="Add operational guidance that should blend into the system prompt."
            value={promptEnhancement}
            onChange={(event) => setPromptEnhancement(event.target.value)}
          />
        </label>
        <div className="rounded-2xl border-2 border-line p-3">
          <div className="text-xs text-muted">Blended system prompt preview</div>
          <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap font-sans text-sm">{blendedPromptPreview}</pre>
        </div>
        <div className="flex justify-end">
          <button className="rounded-md bg-accent px-4 py-2 text-sm font-black text-ink disabled:opacity-50" disabled={busy || !canManage}>
            Save prompt window
          </button>
        </div>
        {!canManage ? <p className="text-xs text-muted">Admin role required to update prompt studio.</p> : null}
      </form>
    </section>
  );
}

function AgentSettingsPanel({
  busy,
  canManage,
  campaign,
  onSave
}: {
  busy: boolean;
  canManage: boolean;
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
    if (!canManage) return;
    onSave(campaign.id, {
      default_language: language,
      voice_preset: voicePreset,
      voice_id: resolveVoiceId(voicePreset, voiceId),
      tone,
      prompt_enhancement: promptEnhancement,
      self_improve_enabled: selfImprove
    });
  }

  return (
    <section className="scroll-mt-6 rounded-2xl bg-panel p-5 text-ink" id="settings">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-surface">Agent Settings</p>
          <h2 className="mt-1 text-2xl font-black">Agent settings</h2>
          <p className="text-sm text-muted">Saved changes apply to future calls only. Prompt guidance is edited in Prompt Studio.</p>
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
            {languageOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {voicePreset === "openai_custom" ? (
          <label className="block text-sm font-medium">
            OpenAI custom voice ID
            <input className="mt-1 w-full rounded-md border border-line px-3 py-2" placeholder="voice_1234" value={voiceId} onChange={(event) => setVoiceId(event.target.value)} />
          </label>
        ) : null}
        {voicePreset === "openai_custom" ? <p className="text-xs text-muted md:col-span-2">Built-in voice IDs: {openAiBuiltInVoices.join(", ")}.</p> : null}
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
        <input type="hidden" value={promptEnhancement} readOnly />
        <label className="flex items-center gap-2 text-sm font-medium">
          <input checked={selfImprove} type="checkbox" onChange={(event) => setSelfImprove(event.target.checked)} />
          Self-improve future calls from short call notes
        </label>
        <a className="text-sm font-black text-surface" href="#prompt-studio">
          Edit prompt guidance in Prompt Studio
        </a>
        <div className="flex justify-end md:col-span-2">
          <button className="rounded-md bg-accent px-4 py-2 text-sm font-black text-ink disabled:opacity-50" disabled={busy || !canManage}>
            Save agent settings
          </button>
        </div>
        {!canManage ? <p className="text-xs text-muted md:col-span-2">Admin role required to edit agent settings.</p> : null}
      </form>
    </section>
  );
}

function DownloadsPanel({ campaign }: { campaign: Campaign }) {
  return (
    <section className="scroll-mt-6 rounded-2xl bg-panel p-5 text-ink" id="exports">
      <p className="text-xs font-black uppercase tracking-wide text-surface">Downloads</p>
      <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black">Export campaign results</h2>
          <p className="mt-1 text-sm text-muted">Download normal result exports for operations handoff. Raw secrets and provider payloads stay out of these files.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="rounded-md bg-accent px-4 py-2 text-sm font-black text-ink" href={`/api/campaigns/${campaign.id}/export`}>
            Download CSV
          </a>
          <a className="rounded-md border-2 border-line px-4 py-2 text-sm font-black text-ink" href={`/api/campaigns/${campaign.id}/export?format=html`}>
            Download HTML
          </a>
        </div>
      </div>
    </section>
  );
}

function ResultsTable({
  rows,
  canManage,
  selectedContactIds,
  onToggleContact,
  onToggleAll,
  onDownloadTranscript,
  onStartSelected,
  busy
}: {
  rows: CampaignResults["rows"];
  canManage: boolean;
  selectedContactIds: string[];
  onToggleContact: (contactId: string) => void;
  onToggleAll: (contactIds: string[]) => void;
  onDownloadTranscript: (call: Campaign["calls"][number]) => void;
  onStartSelected: () => void;
  busy: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [dispositionFilter, setDispositionFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [qaFilter, setQaFilter] = useState("all");
  const filteredRows = useMemo(
    () => filterResultRows(rows, { status: statusFilter, disposition: dispositionFilter, language: languageFilter, qa: qaFilter }),
    [rows, statusFilter, dispositionFilter, languageFilter, qaFilter]
  );
  const visibleContactIds = filteredRows.map((row) => String(row.contact_id));
  const everyVisibleSelected = visibleContactIds.length > 0 && visibleContactIds.every((contactId) => selectedContactIds.includes(contactId));

  return (
    <section className="scroll-mt-6 overflow-hidden rounded-2xl bg-panel text-ink" id="results">
      <div className="border-b-2 border-line p-5">
        <p className="text-xs font-black uppercase tracking-wide text-surface">Results</p>
        <h2 className="mt-1 text-2xl font-black">Results and uploaded details</h2>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3 text-white">
          <div className="text-sm font-semibold">
            {selectedContactIds.length > 0
              ? `${selectedContactIds.length} contact${selectedContactIds.length === 1 ? "" : "s"} selected for start`
              : "Select uploaded contacts here, then start only those calls."}
          </div>
          <div className="flex flex-wrap gap-2">
            {canManage ? (
              <button
                className="rounded-md bg-accent px-3 py-2 text-sm font-black text-ink disabled:opacity-50"
                disabled={busy || visibleContactIds.length === 0}
                onClick={() => onToggleAll(visibleContactIds)}
                type="button"
              >
                {everyVisibleSelected ? "Clear visible" : "Select visible"}
              </button>
            ) : null}
            {canManage ? (
              <button
                className="rounded-md border-2 border-white px-3 py-2 text-sm font-black text-white disabled:opacity-50"
                disabled={busy || visibleContactIds.length === 0}
                onClick={onStartSelected}
                type="button"
              >
                {selectedContactIds.length > 0 ? "Start selected" : "Start visible"}
              </button>
            ) : null}
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <label className="text-sm font-medium">
            Status
            <select className="mt-1 w-full rounded-md border border-line px-3 py-2" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="not_queued">Not queued</option>
              <option value="queued">Queued</option>
              <option value="ringing">Ringing</option>
              <option value="answered">Answered</option>
              <option value="completed">Completed</option>
              <option value="not_picked">Not picked</option>
              <option value="not_connected">Not connected</option>
              <option value="invalid_number">Invalid number</option>
              <option value="voicemail">Voicemail</option>
              <option value="failed">Failed</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Disposition
            <select className="mt-1 w-full rounded-md border border-line px-3 py-2" value={dispositionFilter} onChange={(event) => setDispositionFilter(event.target.value)}>
              <option value="all">All dispositions</option>
              <option value="confirmed_pickup">Confirmed pickup</option>
              <option value="follow_up_needed">Follow-up needed</option>
              <option value="declined">Declined</option>
              <option value="manual_review">Manual review</option>
              <option value="not_picked">Not picked</option>
              <option value="not_connected">Not connected</option>
              <option value="invalid_number">Invalid number</option>
              <option value="voicemail">Voicemail</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Language
            <select className="mt-1 w-full rounded-md border border-line px-3 py-2" value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value)}>
              <option value="all">All languages</option>
              {languageOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            QA verification
            <select className="mt-1 w-full rounded-md border border-line px-3 py-2" value={qaFilter} onChange={(event) => setQaFilter(event.target.value)}>
              <option value="all">All QA scores</option>
              <option value="pass">Pass</option>
              <option value="warn">Warn</option>
              <option value="fail">Fail</option>
              <option value="none">No score</option>
            </select>
          </label>
        </div>
      </div>
      <div className="space-y-3 p-4 md:hidden">
        {filteredRows.length === 0 ? <div className="py-4 text-center text-sm text-muted">No results match the current filters.</div> : null}
        {filteredRows.map((row) => (
          <article className={`rounded-2xl border-2 p-3 ${resolveRowHighlight(row.call?.status ?? "not_queued")}`} key={String(row.contact_id)}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {canManage ? (
                  <input
                    aria-label={`Select ${String(row.provider_name ?? "contact")}`}
                    checked={selectedContactIds.includes(String(row.contact_id))}
                    className="mt-1 h-4 w-4"
                    onChange={() => onToggleContact(String(row.contact_id))}
                    type="checkbox"
                  />
                ) : null}
                <div>
                  <div className="font-semibold">{String(row.provider_name ?? "")}</div>
                  <div className="mt-1 font-mono text-sm text-muted">{String(row.phone ?? "")}</div>
                </div>
              </div>
              <StatusBadge status={row.call?.status ?? "not_queued"} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <InfoField label="Location" value={String(row.location ?? "")} />
              <InfoField label="Order" value={String(row.order_id ?? "")} />
              <InfoField label="Language" value={String(row.language_hint ?? "")} />
              <InfoField label="Detected" value={row.call?.detected_language ?? "-"} />
              <InfoField label="QA score" value={row.call ? String(row.call.qa_score) : "-"} />
              <InfoField label="Attitude" value={row.call?.receiver_attitude ?? "unknown"} />
              <InfoField label="Disposition" value={row.call?.disposition ?? "unknown"} />
              <InfoField label="Next action" value={row.call?.next_action ?? "none"} />
              <InfoField label="Callback at" value={formatDateTime(row.call?.callback_requested_at)} />
              <InfoField label="Transcript" value={resolveTranscriptLabel(row.call?.transcript_status)} />
            </div>
            {row.call ? <QaBadge call={row.call} /> : null}
            <div className="mt-3 text-sm text-muted">{row.call?.summary_text ?? "No remarks yet."}</div>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              {row.call ? <a className="font-black text-surface" href={`/campaigns/calls/${row.call.id}`}>Open detail</a> : null}
              {row.call?.recording_url ? <a className="font-black text-surface" href={row.call.recording_url}>Open recording</a> : "Recording pending"}
              {row.call?.transcript_text ? (
                <button className="font-black text-surface" onClick={() => onDownloadTranscript(row.call!)} type="button">
                  Download transcript
                </button>
              ) : null}
            </div>
            {row.call ? <CallHistoryDetails call={row.call} /> : null}
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1320px] text-left text-sm">
          <thead className="bg-surface text-white">
            <tr>
              {["Pick", "Name", "Phone", "Location", "Order", "Lang", "Status", "Disposition", "Detected", "QA", "Next", "Transcript", "Recording", "Remarks"].map((header) => (
                <th className="border-b border-line px-3 py-2 font-semibold" key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <Fragment key={String(row.contact_id)}>
                <tr className={`border-b ${resolveTableRowHighlight(row.call?.status ?? "not_queued")}`}>
                  <td className="px-3 py-2">
                    {canManage ? <input checked={selectedContactIds.includes(String(row.contact_id))} onChange={() => onToggleContact(String(row.contact_id))} type="checkbox" /> : "-"}
                  </td>
                  <td className="px-3 py-2 font-semibold">{String(row.provider_name ?? "")}</td>
                  <td className="px-3 py-2 font-mono">{String(row.phone ?? "")}</td>
                  <td className="px-3 py-2">{String(row.location ?? "")}</td>
                  <td className="px-3 py-2">{String(row.order_id ?? "")}</td>
                  <td className="px-3 py-2">{String(row.language_hint ?? "")}</td>
                  <td className="px-3 py-2"><StatusBadge status={row.call?.status ?? "not_queued"} /></td>
                  <td className="px-3 py-2">{row.call?.disposition ?? "unknown"}</td>
                  <td className="px-3 py-2">{row.call?.detected_language ?? ""}</td>
                  <td className="px-3 py-2">{row.call ? <QaBadge call={row.call} compact /> : "-"}</td>
                  <td className="px-3 py-2">{row.call?.next_action ?? "none"}</td>
                  <td className="px-3 py-2">{resolveTranscriptLabel(row.call?.transcript_status)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      {row.call ? <a className="font-black text-surface" href={`/campaigns/calls/${row.call.id}`}>detail</a> : null}
                      {row.call?.recording_url ? <a className="font-black text-surface" href={row.call.recording_url}>recording</a> : <span>none</span>}
                      {row.call?.transcript_text ? (
                        <button className="font-black text-surface" onClick={() => onDownloadTranscript(row.call!)} type="button">
                          transcript
                        </button>
                      ) : null}
                    </div>
                  </td>
                  <td className="max-w-[280px] px-3 py-2">{row.call?.callback_remarks || row.call?.missed_call_note || row.call?.summary_text || ""}</td>
                </tr>
                {row.call ? (
                  <tr className="border-b border-line bg-surface/60">
                    <td className="px-3 py-2" colSpan={14}>
                      <CallHistoryDetails call={row.call} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
            {filteredRows.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-muted" colSpan={14}>No results match the current filters.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function resolveTranscriptLabel(transcriptStatus: string | undefined) {
  if (transcriptStatus === "realtime") return "Whisper transcript ready";
  if (transcriptStatus === "simulated") return "Demo transcript ready";
  return "Transcript pending";
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`rounded-md px-2 py-1 text-xs font-black ${resolveStatusBadgeClassName(status)}`}>{status.replace(/_/g, " ")}</span>;
}

function resolveStatusBadgeClassName(status: string) {
  if (status === "completed") return "bg-success text-white";
  if (status === "ringing" || status === "initiated" || status === "answered") return "bg-accent text-ink";
  if (status === "queued") return "border border-line bg-white text-ink";
  if (status === "not_picked" || status === "not_connected" || status === "voicemail") return "bg-amber-100 text-amber-800";
  if (status === "invalid_number" || status === "failed") return "bg-red-100 text-red-700";
  return "border border-line bg-white text-ink";
}

function resolveRowHighlight(status: string) {
  if (status === "completed") return "border-success bg-green-50";
  return "border-line";
}

function resolveTableRowHighlight(status: string) {
  if (status === "completed") return "border-line bg-green-50 font-semibold";
  return "border-line";
}

function CallHistoryDetails({ call }: { call: Campaign["calls"][number] }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer font-medium text-accent">Call history and transcript</summary>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <InfoField label="Live status" value={call.status} />
        <InfoField label="Last call" value={call.last_call_time ?? "-"} />
        <InfoField label="Receiver attitude" value={call.receiver_attitude ?? "unknown"} />
        <InfoField label="Attitude confidence" value={String(call.receiver_attitude_confidence ?? 0)} />
        <InfoField label="Callback requested at" value={formatDateTime(call.callback_requested_at)} />
        <InfoField label="Callback remarks" value={call.callback_remarks || "-"} />
        <InfoField label="Missed call note" value={call.missed_call_note || "-"} />
        <InfoField label="Voice" value={`${call.voice_preset_snapshot ?? "-"} (${call.voice_id_snapshot ?? "-"})`} />
        <InfoField label="Tone" value={call.tone_snapshot ?? "-"} />
        <InfoField label="Transcript" value={call.transcript_status ?? "missing"} />
      </div>
      <div className="mt-3 rounded-md border border-line bg-panel p-3">
        <div className="text-xs text-muted">Behavior verification</div>
        <div className="mt-2 grid gap-2 md:grid-cols-4">
          <InfoField label="Language QA" value={call.qa_language_status ?? "warn"} />
          <InfoField label="Tone QA" value={call.qa_tone_status ?? "warn"} />
          <InfoField label="QA score" value={String(call.qa_score ?? 0)} />
          <InfoField label="Summary" value={call.qa_notes ?? "No QA notes yet."} />
        </div>
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

function QaBadge({ call, compact = false }: { call: Campaign["calls"][number]; compact?: boolean }) {
  if ((call.transcript_status ?? "missing") === "missing") {
    return <span className="inline-flex rounded border border-line bg-surface px-2 py-1 text-xs font-medium text-muted">QA pending</span>;
  }
  const score = call.qa_score ?? 0;
  const level = score >= 75 ? "pass" : score >= 50 ? "warn" : "fail";
  const label = `QA ${level.toUpperCase()} (${score})`;
  const className =
    level === "pass"
      ? "bg-green-50 text-green-700 border-green-200"
      : level === "warn"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-red-50 text-red-700 border-red-200";

  return <span className={`inline-flex rounded border px-2 py-1 text-xs font-medium ${className}`}>{compact ? score : label}</span>;
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

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function EmptyState() {
  return (
    <section className="rounded-lg border border-dashed border-line bg-panel p-8 text-center">
      <h2 className="text-lg font-semibold">No campaign yet</h2>
      <p className="mt-2 text-sm text-muted">Upload an Excel or CSV contact list to begin the live operations workflow.</p>
    </section>
  );
}
