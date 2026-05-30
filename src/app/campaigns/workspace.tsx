"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { buildPromptStudioPreview, promptChecklistToText } from "@/domain/voice-agent";
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
    call_purpose: string;
    request_type: string;
    asset_label: string;
    reference_label: string;
    address_label: string;
    confirmation_points: string[];
    collection_points: string[];
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

type UploadResponse = {
  campaign: Campaign;
  import_summary: UploadSummary;
  error?: string;
};

type CampaignActionResponse = {
  campaign: Campaign;
  stats: Record<string, number>;
  error?: string;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: { resultIndex: number; results: BrowserSpeechRecognitionResultList }) => void) | null;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionResultList = {
  length: number;
  [index: number]: { [index: number]: { transcript: string } | undefined } | undefined;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => BrowserSpeechRecognition;
  webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
};

type RehearsalAnalysis = {
  consent: "granted" | "denied" | "unclear";
  availability: "available" | "busy" | "unclear";
  sentiment: "positive" | "negative" | "neutral";
  goalCaptured: boolean;
  nextAction: string;
};

const defaultPromptConfig: {
  companyName: string;
  callPurpose: string;
  requestType: string;
  assetLabel: string;
  referenceLabel: string;
  addressLabel: string;
  confirmationPoints: string[];
  collectionPoints: string[];
} = {
  companyName: "UDS",
  callPurpose: "validate merchant details and confirm service readiness",
  requestType: "de-installation",
  assetLabel: "POS machine",
  referenceLabel: "terminal ID",
  addressLabel: "service address",
  confirmationPoints: [
    "Confirm the merchant or store name",
    "Confirm the service address or branch location",
    "Confirm the device or request reference",
    "Confirm whether the request can proceed now"
  ],
  collectionPoints: [
    "Readiness confirmation or current status",
    "Reason for delay or blocker if not ready",
    "Preferred callback time if follow-up is needed",
    "Any address correction or landmark note"
  ]
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
  { href: "/campaigns/contacts", label: "Contacts" },
  { href: "/campaigns/settings", label: "Agent settings" },
  { href: "/campaigns/results", label: "Results" }
] as const;

const neumorphicRaised = "bg-[#E0E5EC] shadow-[9px_9px_16px_rgb(163,177,198,0.6),-9px_-9px_16px_rgba(255,255,255,0.5)]";
const neumorphicRaisedSmall = "bg-[#E0E5EC] shadow-[5px_5px_10px_rgb(163,177,198,0.6),-5px_-5px_10px_rgba(255,255,255,0.5)]";
const neumorphicInset = "bg-[#E0E5EC] shadow-[inset_6px_6px_10px_rgb(163,177,198,0.6),inset_-6px_-6px_10px_rgba(255,255,255,0.5)]";
const focusRing = "focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:ring-offset-2 focus:ring-offset-[#E0E5EC]";
const formControl = `${neumorphicInset} ${focusRing} mt-1 w-full rounded-2xl border-0 px-4 py-3 text-[#3D4852] placeholder:text-[#6B7280]`;
const primaryAction = `${neumorphicRaisedSmall} ${focusRing} rounded-2xl bg-[#6C63FF] px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#8B84FF] disabled:cursor-not-allowed disabled:opacity-50`;
const secondaryAction = `${neumorphicRaisedSmall} ${focusRing} rounded-2xl px-5 py-3 text-sm font-black text-[#3D4852] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50`;
const softChip = `${neumorphicInset} rounded-2xl px-3 py-2 text-xs font-black text-[#3D4852]`;

function resolveVoiceId(voicePreset: AgentSettings["voice_preset"], voiceId: string) {
  if (voicePreset === "indian_female_natural") return "marin";
  if (voicePreset === "indian_male_natural") return "cedar";
  return voiceId.trim() || "marin";
}

function splitChecklistText(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export type CampaignWorkspaceView = "contacts" | "settings" | "results";

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

  useEffect(() => {
    if (!selected?.id) return;
    if (view !== "results" && selected.status !== "running") return;

    const interval = window.setInterval(() => {
      void loadCampaigns();
      void loadResults(selected.id);
    }, 4_000);

    return () => window.clearInterval(interval);
  }, [selected?.id, selected?.status, view]);

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

  async function uploadFile(formData: FormData, options?: { autoStart?: boolean }) {
    setBusy(true);
    setMessage("Uploading and validating contacts...");
    setUploadSummary(null);
    const response = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await readJsonPayload<UploadResponse>(response);
    if (!response.ok || !data) {
      setBusy(false);
      setMessage(getErrorMessage(data, "Upload failed. Please check the file and try again."));
      return;
    }
    setUploadSummary(data.import_summary as UploadSummary);
    const createdCampaign = data.campaign as Campaign;
    setMessage(`Imported ${data.import_summary.imported} contacts. Invalid: ${data.import_summary.invalid}. Duplicates: ${data.import_summary.duplicates}.`);
    await loadCampaigns();
    selectCampaign(createdCampaign.id);

    if (options?.autoStart && createdCampaign.contacts.length > 0) {
      const contactIds = createdCampaign.contacts.map((contact) => String(contact.id));
      setBusy(true);
      setMessage(contactIds.length === 1 ? "Starting the fresh number now..." : `Starting ${contactIds.length} fresh contacts now...`);
      const startResponse = await fetch(`/api/campaigns/${createdCampaign.id}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_ids: contactIds })
      });
      const startData = await readJsonPayload<CampaignActionResponse>(startResponse);
      setBusy(false);
      if (!startResponse.ok || !startData) {
        setMessage(getErrorMessage(startData, "Uploaded contacts were saved, but auto-start failed."));
        return;
      }

      setCampaigns((current) => current.map((campaign) => (campaign.id === startData.campaign.id ? startData.campaign : campaign)));
      setSelectedContactIdsByCampaign((current) => ({ ...current, [startData.campaign.id]: [] }));
      await loadResults(startData.campaign.id);
      setMessage(contactIds.length === 1 ? "Fresh number created and started." : "Fresh contacts created and started.");
      return;
    }

    setBusy(false);
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

  async function saveAgentSettings(
    campaignId: string,
    settings: AgentSettings & {
      company_name: string;
      default_language: string;
      call_purpose: string;
      request_type: string;
      asset_label: string;
      reference_label: string;
      address_label: string;
      confirmation_points: string[];
      collection_points: string[];
    }
  ) {
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
    <main className="min-h-dvh overflow-x-hidden bg-[#E0E5EC] px-4 pb-24 pt-4 text-[#3D4852] sm:px-6 lg:pb-8">
      <div className="mx-auto max-w-7xl">
        <header className={`${neumorphicRaised} rounded-[32px] p-5 sm:p-7`}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#6B7280]">Outbound calling workspace</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-[#3D4852] sm:text-5xl">{header.title}</h1>
              <p className="mt-2 max-w-2xl text-sm font-medium text-[#6B7280] sm:text-base">{header.description}</p>
            </div>
            <div className={`${neumorphicInset} rounded-2xl px-4 py-3 text-sm font-bold text-[#3D4852]`}>
              Signed in as <span className="uppercase text-[#6C63FF]">{session.role ?? "guest"}</span>
            </div>
          </div>
          <nav className="mt-6 grid gap-3 text-sm font-black sm:grid-cols-3">
            {workspaceNavigation.map((item) => (
              <TopNavLink key={item.href} href={item.href} label={item.label} pathname={pathname} />
            ))}
          </nav>
        </header>

        <section className="mt-6 space-y-6">
          {message ? <div className={`${neumorphicInset} rounded-2xl px-5 py-4 text-sm font-bold text-[#3D4852]`}>{message}</div> : null}
          <CampaignSelector campaigns={campaigns} selectedId={selected?.id ?? ""} onSelect={selectCampaign} />
          {view === "contacts" ? <UploadPanel busy={busy} canManage={canManage} campaignDefaults={selected} onUpload={uploadFile} /> : null}
          {uploadSummary && view === "contacts" ? <UploadSummaryPanel summary={uploadSummary} /> : null}
          {view === "contacts" && selected ? <MetricBand campaign={selected} stats={results?.stats ?? {}} /> : null}
          {view === "settings" && selected ? <AgentSettingsPanel busy={busy} canManage={canManage} campaign={selected} onSave={saveAgentSettings} /> : null}
          {view === "settings" && selected ? <PromptStudioPanel busy={busy} canManage={canManage} campaign={selected} onSave={saveAgentSettings} /> : null}
          {view === "settings" ? <DeviceVoiceRehearsalPanel selected={selected} /> : null}
          {view === "results" && selected ? <MetricBand campaign={selected} stats={results?.stats ?? {}} /> : null}
          {view === "results" && selected ? (
            <div className="grid gap-6">
              <DownloadsPanel campaign={selected} />
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
            </div>
          ) : null}
          {!selected ? <EmptyState /> : null}
        </section>
      </div>
      <nav className={`${neumorphicRaised} fixed inset-x-3 bottom-3 z-20 grid grid-cols-3 rounded-[24px] p-2 text-center text-xs font-black text-[#3D4852] lg:hidden`}>
        {workspaceNavigation.map((item) => (
          <Link className={`rounded-2xl px-2 py-3 ${pathname === item.href ? "bg-[#6C63FF] text-white" : ""}`} href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}

async function readJsonPayload<T extends Record<string, unknown>>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function getErrorMessage(payload: Record<string, unknown> | null, fallback: string) {
  return typeof payload?.error === "string" && payload.error.trim() ? payload.error : fallback;
}

function TopNavLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = pathname === href;
  return (
    <Link
      className={`block rounded-2xl px-4 py-3 text-center transition duration-300 ease-out ${focusRing} ${
        active
          ? "bg-[#6C63FF] text-white shadow-[inset_3px_3px_6px_rgb(75,68,200,0.45),inset_-3px_-3px_6px_rgba(255,255,255,0.2)]"
          : `${neumorphicRaisedSmall} hover:-translate-y-0.5 hover:shadow-[12px_12px_20px_rgb(163,177,198,0.7),-12px_-12px_20px_rgba(255,255,255,0.6)]`
      }`}
      href={href}
    >
      {label}
    </Link>
  );
}

function getWorkspaceHeader(view: CampaignWorkspaceView) {
  if (view === "contacts") {
    return {
      title: "Contacts",
      description: "Add a single mobile number or upload a contact file. This is the only place operators add people to call."
    };
  }
  if (view === "results") {
    return {
      title: "Results",
      description: "Review call outcomes, transcripts, summaries, and download exports from one screen."
    };
  }
  if (view === "settings") {
    return {
      title: "Agent settings",
      description: "Control voice, tone, language, prompt behavior, and rehearsal from one settings page."
    };
  }
  return {
    title: "Contacts",
    description: "Add contacts, tune the agent, then review results."
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
  onUpload: (formData: FormData, options?: { autoStart?: boolean }) => void;
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
  const [manualCallPurpose, setManualCallPurpose] = useState(quickCheckDefaults.promptConfig.call_purpose);
  const [manualRequestType, setManualRequestType] = useState(quickCheckDefaults.promptConfig.request_type);
  const [manualAssetLabel, setManualAssetLabel] = useState(quickCheckDefaults.promptConfig.asset_label);
  const [manualReferenceLabel, setManualReferenceLabel] = useState(quickCheckDefaults.promptConfig.reference_label);
  const [manualAddressLabel, setManualAddressLabel] = useState(quickCheckDefaults.promptConfig.address_label);
  const [manualConfirmationPoints, setManualConfirmationPoints] = useState(promptChecklistToText(quickCheckDefaults.promptConfig.confirmation_points));
  const [manualCollectionPoints, setManualCollectionPoints] = useState(promptChecklistToText(quickCheckDefaults.promptConfig.collection_points));
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
    setManualCallPurpose(quickCheckDefaults.promptConfig.call_purpose);
    setManualRequestType(quickCheckDefaults.promptConfig.request_type);
    setManualAssetLabel(quickCheckDefaults.promptConfig.asset_label);
    setManualReferenceLabel(quickCheckDefaults.promptConfig.reference_label);
    setManualAddressLabel(quickCheckDefaults.promptConfig.address_label);
    setManualConfirmationPoints(promptChecklistToText(quickCheckDefaults.promptConfig.confirmation_points));
    setManualCollectionPoints(promptChecklistToText(quickCheckDefaults.promptConfig.collection_points));
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
          call_purpose: manualCallPurpose,
          request_type: manualRequestType,
          asset_label: manualAssetLabel,
          reference_label: manualReferenceLabel,
          address_label: manualAddressLabel,
          confirmation_points: splitChecklistText(manualConfirmationPoints),
          collection_points: splitChecklistText(manualCollectionPoints)
        },
        agentSettings: {
          voice_preset: manualVoicePreset,
          voice_id: resolveVoiceId(manualVoicePreset, manualVoiceId),
          tone: manualTone,
          prompt_enhancement: manualPromptEnhancement,
          self_improve_enabled: manualSelfImprove
        }
      }),
      { autoStart: true }
    );
  }

  return (
    <section className={`${neumorphicRaised} rounded-[32px] p-5 text-[#3D4852] sm:p-7`} id="upload">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-[#38B2AC]">Add contacts</p>
        <h2 className="mt-1 text-2xl font-black">Who should the agent call?</h2>
        <p className="mt-1 text-sm text-muted">Start with one number for a quick check, paste many numbers, or upload a CSV/XLSX file.</p>
        <a className={`${secondaryAction} mt-4 inline-flex`} href="/sample-mobile-upload.csv" download>
          Download sample upload file
        </a>
      </div>
      <div className={`${neumorphicInset} mt-5 grid grid-cols-3 gap-2 rounded-[24px] p-2 text-sm`}>
        <button
          className={`rounded-2xl px-2 py-3 font-black transition ${focusRing} ${intakeMode === "single" ? "bg-[#6C63FF] text-white shadow-[inset_4px_4px_8px_rgb(69,62,189,0.25)]" : "text-muted"}`}
          type="button"
          onClick={() => setIntakeMode("single")}
        >
          One number
        </button>
        <button
          className={`rounded-2xl px-2 py-3 font-black transition ${focusRing} ${intakeMode === "list" ? "bg-[#6C63FF] text-white shadow-[inset_4px_4px_8px_rgb(69,62,189,0.25)]" : "text-muted"}`}
          type="button"
          onClick={() => setIntakeMode("list")}
        >
          Paste list
        </button>
        <button
          className={`rounded-2xl px-2 py-3 font-black transition ${focusRing} ${intakeMode === "file" ? "bg-[#6C63FF] text-white shadow-[inset_4px_4px_8px_rgb(69,62,189,0.25)]" : "text-muted"}`}
          type="button"
          onClick={() => setIntakeMode("file")}
        >
          Upload file
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
            <input className={formControl} name="campaign_name" value={fileCampaignName} onChange={(event) => setFileCampaignName(event.target.value)} />
          </label>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Calling mode
              <select className={formControl} name="provider" value={manualProvider} onChange={(event) => setManualProvider(event.target.value)}>
                <option value="simulated">Instant demo run</option>
                <option value="plivo">Plivo live call</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Default language
              <select className={formControl} name="default_language" value={manualLanguage} onChange={(event) => setManualLanguage(event.target.value)}>
                {languageOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="mt-3 block text-sm font-medium">
            Contact file
            <input className={formControl} name="file" type="file" accept=".csv,.xlsx" required />
          </label>
          <label className="mt-3 block text-sm font-medium">
            Simultaneous calls
            <input
              className={formControl}
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
          <details className={`${neumorphicInset} mt-4 rounded-[24px] p-4`}>
            <summary className="cursor-pointer text-sm font-black text-[#38B2AC]">Advanced script and voice settings</summary>
            <label className="mt-3 block text-sm font-medium">
              Company name
              <input className={formControl} name="company_name" value={manualCompanyName} onChange={(event) => setManualCompanyName(event.target.value)} />
            </label>
            <label className="mt-3 block text-sm font-medium">
              Call purpose
              <input className={formControl} name="call_purpose" value={manualCallPurpose} onChange={(event) => setManualCallPurpose(event.target.value)} />
            </label>
            <label className="mt-3 block text-sm font-medium">
              Request type
              <input className={formControl} name="request_type" value={manualRequestType} onChange={(event) => setManualRequestType(event.target.value)} />
            </label>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block text-sm font-medium">
                Asset label
                <input className={formControl} name="asset_label" value={manualAssetLabel} onChange={(event) => setManualAssetLabel(event.target.value)} />
              </label>
              <label className="block text-sm font-medium">
                Reference label
                <input className={formControl} name="reference_label" value={manualReferenceLabel} onChange={(event) => setManualReferenceLabel(event.target.value)} />
              </label>
              <label className="block text-sm font-medium">
                Address label
                <input className={formControl} name="address_label" value={manualAddressLabel} onChange={(event) => setManualAddressLabel(event.target.value)} />
              </label>
            </div>
            <label className="mt-3 block text-sm font-medium">
              Confirmation checklist
              <textarea className={`${formControl} min-h-24`} name="confirmation_points" value={manualConfirmationPoints} onChange={(event) => setManualConfirmationPoints(event.target.value)} />
            </label>
            <label className="mt-3 block text-sm font-medium">
              Information to collect
              <textarea className={`${formControl} min-h-24`} name="collection_points" value={manualCollectionPoints} onChange={(event) => setManualCollectionPoints(event.target.value)} />
            </label>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Voice preset
                <select
                  className={formControl}
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
                <select className={formControl} name="tone" value={manualTone} onChange={(event) => setManualTone(event.target.value as AgentSettings["tone"])}>
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
                <input className={formControl} placeholder="voice_1234" value={manualVoiceId} onChange={(event) => setManualVoiceId(event.target.value)} />
              </label>
            ) : null}
            <p className="mt-2 text-xs text-muted">Built-in IDs you can use: {openAiBuiltInVoices.join(", ")}. Use Prompt Studio after creation for script guidance.</p>
            <label className="mt-3 flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={manualSelfImprove} onChange={(event) => setManualSelfImprove(event.target.checked)} />
              Self-improve future calls from short call notes
            </label>
          </details>
          <input name="voice_id" type="hidden" value={resolveVoiceId(manualVoicePreset, manualVoiceId)} readOnly />
          <input name="prompt_enhancement" type="hidden" value={manualPromptEnhancement} readOnly />
          <input name="self_improve_enabled" type="hidden" value={String(manualSelfImprove)} readOnly />
          <button className={`${primaryAction} mt-4 w-full`} disabled={busy || !canManage}>
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
            <input className={formControl} value={manualCampaignName} onChange={(event) => setManualCampaignName(event.target.value)} />
          </label>
          {intakeMode === "single" ? (
            <label className="block text-sm font-medium">
              Mobile number
              <input
                className={formControl}
                placeholder="+919876543210 or 9876543210"
                value={manualPhone}
                onChange={(event) => setManualPhone(event.target.value)}
              />
            </label>
          ) : (
            <label className="block text-sm font-medium">
              Mobile numbers
              <textarea
                className={`${formControl} min-h-28`}
                placeholder={"+919876543210\n9876543211\n9876543212"}
                value={manualPhoneList}
                onChange={(event) => setManualPhoneList(event.target.value)}
              />
            </label>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Calling mode
              <select className={formControl} value={manualProvider} onChange={(event) => setManualProvider(event.target.value)}>
                <option value="simulated">Instant demo run</option>
                <option value="plivo">Plivo live call</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Preferred language
              <select className={formControl} value={manualLanguage} onChange={(event) => setManualLanguage(event.target.value)}>
                {languageOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm font-medium">
            Simultaneous calls
            <input
              className={formControl}
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
          <details className={`${neumorphicInset} rounded-[24px] p-4`}>
            <summary className="cursor-pointer text-sm font-black text-[#38B2AC]">Advanced script and voice settings</summary>
            <label className="mt-3 block text-sm font-medium">
              Company name
              <input className={formControl} value={manualCompanyName} onChange={(event) => setManualCompanyName(event.target.value)} />
            </label>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Call purpose
                <input className={formControl} value={manualCallPurpose} onChange={(event) => setManualCallPurpose(event.target.value)} />
              </label>
              <label className="block text-sm font-medium">
                Request type
                <input className={formControl} value={manualRequestType} onChange={(event) => setManualRequestType(event.target.value)} />
              </label>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block text-sm font-medium">
                Asset label
                <input className={formControl} value={manualAssetLabel} onChange={(event) => setManualAssetLabel(event.target.value)} />
              </label>
              <label className="block text-sm font-medium">
                Reference label
                <input className={formControl} value={manualReferenceLabel} onChange={(event) => setManualReferenceLabel(event.target.value)} />
              </label>
              <label className="block text-sm font-medium">
                Address label
                <input className={formControl} value={manualAddressLabel} onChange={(event) => setManualAddressLabel(event.target.value)} />
              </label>
            </div>
            <label className="mt-3 block text-sm font-medium">
              Confirmation checklist
              <textarea className={`${formControl} min-h-24`} value={manualConfirmationPoints} onChange={(event) => setManualConfirmationPoints(event.target.value)} />
            </label>
            <label className="mt-3 block text-sm font-medium">
              Information to collect
              <textarea className={`${formControl} min-h-24`} value={manualCollectionPoints} onChange={(event) => setManualCollectionPoints(event.target.value)} />
            </label>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">
                Voice preset
                <select className={formControl} value={manualVoicePreset} onChange={(event) => setManualVoicePreset(event.target.value as AgentSettings["voice_preset"])}>
                  <option value="indian_female_natural">Indian female natural</option>
                  <option value="indian_male_natural">Indian male natural</option>
                  <option value="openai_custom">OpenAI custom voice</option>
                </select>
              </label>
              <label className="block text-sm font-medium">
                Tone
                <select className={formControl} value={manualTone} onChange={(event) => setManualTone(event.target.value as AgentSettings["tone"])}>
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
                <input className={formControl} placeholder="voice_1234" value={manualVoiceId} onChange={(event) => setManualVoiceId(event.target.value)} />
              </label>
            ) : null}
            <p className="mt-2 text-xs text-muted">Built-in IDs you can use: {openAiBuiltInVoices.join(", ")}. Use Prompt Studio after creation for script guidance.</p>
            <label className="mt-3 flex items-center gap-2 text-sm font-medium">
              <input checked={manualSelfImprove} type="checkbox" onChange={(event) => setManualSelfImprove(event.target.checked)} />
              Self-improve future calls from short call notes
            </label>
          </details>
          <button
            className={`${primaryAction} w-full`}
            disabled={
              busy || (intakeMode === "single" ? !manualPhone.trim() : parsePhoneList(manualPhoneList).length === 0)
                || !canManage
            }
          >
            {intakeMode === "single" ? "Create and start single-number call" : "Create and start number-list calls"}
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
        ["1", "Add contacts", "Enter one number, paste a list, or upload a file."],
        ["2", "Calls run", "Use instant demo mode first, then switch to Plivo for live calls."],
        ["3", "Review results", "Open outcomes and export the handoff file."]
      ]
    : [
        ["1", "Choose a campaign", selected ? `Selected: ${selected.name}` : "Ask an admin to create one first."],
        ["2", "Review outcomes", "Open Results to inspect the calls."],
        ["3", "Download exports", "Use Exports for the handoff file."]
      ];

  return (
    <section className="scroll-mt-6 rounded-2xl bg-accent p-5 text-ink" id="start">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-surface">Start here</p>
          <h2 className="mt-1 text-3xl font-black">{canManage ? "Start with contacts" : "Review the workspace"}</h2>
          <p className="mt-1 max-w-3xl text-sm font-semibold">
            {canManage
              ? "For the fastest path, add a number and let the app create and start the campaign automatically."
              : "User access is read-only, so start with results and exports."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage ? <Link className="rounded-md bg-surface px-3 py-2 text-sm font-black text-white" href="/campaigns/upload">Add contacts</Link> : null}
          <Link className="rounded-md border-2 border-surface px-3 py-2 text-sm font-black text-ink" href={canManage ? "/campaigns/upload" : "/campaigns/results"}>
            {canManage ? "Upload file" : "Open results"}
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

function DeviceVoiceRehearsalPanel({ selected }: { selected?: Campaign }) {
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const [status, setStatus] = useState("Ready to test the device speaker and mic.");
  const [listening, setListening] = useState(false);
  const [spokenLine, setSpokenLine] = useState("");
  const [transcript, setTranscript] = useState("");
  const analysis = useMemo(() => analyzeRehearsalTranscript(transcript), [transcript]);

  function startRehearsal() {
    if (typeof window === "undefined") return;
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    const canSpeak = "speechSynthesis" in window;
    if (!Recognition || !canSpeak) {
      setStatus("This browser does not expose speech synthesis and mic transcription together. Use Chrome or Edge for this rehearsal.");
      return;
    }

    stopRehearsal();
    const line = buildDeviceRehearsalOpening(selected);
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = resolveBrowserSpeechLanguage(selected?.default_language ?? "hi");
    recognition.onresult = (event) => {
      let nextTranscript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        nextTranscript += event.results[index]?.[0]?.transcript ?? "";
      }
      setTranscript((current) => `${current}${nextTranscript}`.trimStart());
    };
    recognition.onerror = (event) => {
      setStatus(`Mic transcript issue: ${event.error ?? "unknown error"}.`);
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
      setStatus("Rehearsal stopped. Review the captured transcript below.");
    };
    recognitionRef.current = recognition;
    setTranscript("");
    setSpokenLine(line);
    setStatus("Playing the agent opening through your speaker...");

    const utterance = new SpeechSynthesisUtterance(line);
    utterance.lang = resolveBrowserSpeechLanguage(selected?.default_language ?? "hi");
    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.onend = () => {
      try {
        recognition.start();
        setListening(true);
        setStatus("Listening through your mic. Reply naturally, then stop the rehearsal.");
      } catch {
        setStatus("Could not start mic capture. Check browser permission for microphone access.");
      }
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function stopRehearsal() {
    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
    }
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }

  return (
    <section className={`${neumorphicRaised} scroll-mt-6 overflow-hidden rounded-[32px] text-[#3D4852]`} id="device-voice-test">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_320px]">
        <div className="p-5 sm:p-7">
          <p className="text-xs font-black uppercase tracking-wide text-[#38B2AC]">Realtime rehearsal</p>
          <h2 className="mt-1 text-2xl font-black">Device speaker and mic simulation</h2>
          <p className="mt-2 text-sm text-muted">
            This browser rehearsal plays a varied agent opener through the device speaker, asks for consent and availability, then captures your reply from the mic for transcript and sentiment checks.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className={primaryAction} onClick={startRehearsal} type="button">
              Start speaker and mic test
            </button>
            <button className={secondaryAction} disabled={!listening && !spokenLine} onClick={stopRehearsal} type="button">
              Stop
            </button>
          </div>
          <div className={`${neumorphicInset} mt-4 rounded-[20px] p-4 text-sm font-semibold`}>{status}</div>
          {spokenLine ? (
            <div className={`${neumorphicInset} mt-3 rounded-[20px] p-4`}>
              <div className="text-xs font-bold uppercase text-muted">Spoken opening</div>
              <p className="mt-1 text-sm">{spokenLine}</p>
            </div>
          ) : null}
          <label className="mt-3 block text-sm font-medium">
            Captured mic transcript
            <textarea className={`${formControl} min-h-28`} readOnly value={transcript || "Transcript will appear here after you speak."} />
          </label>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            <RehearsalChip label="Consent" value={analysis.consent} tone={analysis.consent === "granted" ? "good" : analysis.consent === "denied" ? "warn" : "neutral"} />
            <RehearsalChip label="Availability" value={analysis.availability} tone={analysis.availability === "available" ? "good" : analysis.availability === "busy" ? "warn" : "neutral"} />
            <RehearsalChip label="Sentiment" value={analysis.sentiment} tone={analysis.sentiment === "positive" ? "good" : analysis.sentiment === "negative" ? "warn" : "neutral"} />
            <RehearsalChip label="Goal" value={analysis.goalCaptured ? "captured" : "pending"} tone={analysis.goalCaptured ? "good" : "neutral"} />
          </div>
          <div className={`${neumorphicInset} mt-3 rounded-[20px] p-4 text-sm`}>
            <span className="font-black">Suggested next action: </span>
            {analysis.nextAction}
          </div>
        </div>
        <img alt="Codex generated voice rehearsal loop" className="h-full min-h-72 w-full object-cover" src="/codex-realtime-loop.svg" />
      </div>
    </section>
  );
}

function buildDeviceRehearsalOpening(campaign?: Campaign) {
  const company = campaign?.company_name ?? "UDS";
  const requestType = campaign?.prompt_config.request_type ?? "de-installation";
  const purpose = campaign?.prompt_config.call_purpose ?? "validate merchant details and confirm service readiness";
  const asset = campaign?.prompt_config.asset_label ?? "POS machine";
  const variants = [
    `Namaste, ${company} se call hai. ${asset} ke ${requestType} request ke liye short confirmation chahiye. Is it okay to continue this voice test, and are you available now?`,
    `Hello, I am calling from ${company} about the ${requestType} request for your ${asset}. Do I have your consent to continue this test, and can you confirm if the request can proceed now?`,
    `${company} side se quick verification call hai. We are calling to ${purpose}. Please say if you consent to continue, whether you are available, and whether the request can proceed.`
  ];
  return variants[Math.floor(Math.random() * variants.length)] ?? variants[0];
}

function analyzeRehearsalTranscript(value: string): RehearsalAnalysis {
  const text = value.toLowerCase();
  const hasConsentYes = /(yes|haan|ha|ok|okay|sure|consent|agree|continue|allowed|theek hai)/.test(text);
  const hasConsentNo = /(no|nahi|nahin|do not|don't|stop|not consent|not allowed)/.test(text);
  const available = /(available|free|can talk|boliye|talk now|abhi|yes|haan|ready|proceed)/.test(text);
  const busy = /(busy|meeting|later|call back|callback|driving|not now|baad|kal|tomorrow)/.test(text);
  const positive = /(yes|haan|ready|sure|ok|okay|thank|proceed|available|consent|agree)/.test(text);
  const negative = /(no|nahi|nahin|busy|stop|angry|later|not ready|do not|don't)/.test(text);
  const goalCaptured = (hasConsentYes || hasConsentNo) && (available || busy || /ready|not ready|proceed/.test(text));

  const consent = hasConsentNo ? "denied" : hasConsentYes ? "granted" : "unclear";
  const availability = busy ? "busy" : available ? "available" : "unclear";
  const sentiment = negative && !positive ? "negative" : positive && !negative ? "positive" : "neutral";

  let nextAction = "Ask one short follow-up for consent and availability before treating the rehearsal as passed.";
  if (consent === "denied") {
    nextAction = "Stop the call flow and mark the contact for manual review or do-not-call handling.";
  } else if (consent === "granted" && availability === "available") {
    nextAction = "Proceed with the readiness question and save transcript evidence.";
  } else if (availability === "busy") {
    nextAction = "Ask for a callback time and save follow-up needed.";
  }

  return { consent, availability, sentiment, goalCaptured, nextAction };
}

function RehearsalChip({ label, value, tone }: { label: string; value: string; tone: "good" | "warn" | "neutral" }) {
  const className =
    tone === "good"
      ? "border-green-300 bg-green-100 text-green-800"
      : tone === "warn"
        ? "border-amber-300 bg-amber-100 text-amber-800"
        : "border-[#D1D8E0] bg-[#E0E5EC] text-[#3D4852]";

  return (
    <div className={`rounded-[20px] border px-4 py-3 text-sm ${className}`}>
      <div className="text-xs font-bold uppercase">{label}</div>
      <div className="mt-1 font-black">{value}</div>
    </div>
  );
}

function resolveBrowserSpeechLanguage(language: string) {
  const languageMap: Record<string, string> = {
    hi: "hi-IN",
    en: "en-IN",
    bn: "bn-IN",
    pa: "pa-IN",
    gu: "gu-IN",
    mr: "mr-IN",
    ta: "ta-IN",
    te: "te-IN",
    ml: "ml-IN",
    kn: "kn-IN",
    or: "or-IN",
    as: "as-IN"
  };
  return languageMap[language] ?? "hi-IN";
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
  const [callPurpose, setCallPurpose] = useState(defaults?.prompt_config.call_purpose ?? defaultPromptConfig.callPurpose);
  const [requestType, setRequestType] = useState(defaults?.prompt_config.request_type ?? defaultPromptConfig.requestType);
  const [assetLabel, setAssetLabel] = useState(defaults?.prompt_config.asset_label ?? "POS machine");
  const [referenceLabel, setReferenceLabel] = useState(defaults?.prompt_config.reference_label ?? defaultPromptConfig.referenceLabel);
  const [addressLabel, setAddressLabel] = useState(defaults?.prompt_config.address_label ?? defaultPromptConfig.addressLabel);
  const [confirmationPoints, setConfirmationPoints] = useState(promptChecklistToText(defaults?.prompt_config.confirmation_points ?? defaultPromptConfig.confirmationPoints));
  const [collectionPoints, setCollectionPoints] = useState(promptChecklistToText(defaults?.prompt_config.collection_points ?? defaultPromptConfig.collectionPoints));
  const [tone, setTone] = useState<AgentSettings["tone"]>(defaults?.agent_settings?.tone ?? "warm");

  useEffect(() => {
    if (!defaults) return;
    setCompany(defaults.company_name);
    setLanguage(defaults.default_language);
    setProvider(defaults.provider === "plivo" ? "plivo" : "simulated");
    setConcurrency(defaults.concurrency_limit);
    setCallPurpose(defaults.prompt_config.call_purpose);
    setRequestType(defaults.prompt_config.request_type);
    setAssetLabel(defaults.prompt_config.asset_label);
    setReferenceLabel(defaults.prompt_config.reference_label);
    setAddressLabel(defaults.prompt_config.address_label);
    setConfirmationPoints(promptChecklistToText(defaults.prompt_config.confirmation_points));
    setCollectionPoints(promptChecklistToText(defaults.prompt_config.collection_points));
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
        call_purpose: callPurpose,
        request_type: requestType,
        asset_label: assetLabel,
        reference_label: referenceLabel,
        address_label: addressLabel,
        confirmation_points: splitChecklistText(confirmationPoints),
        collection_points: splitChecklistText(collectionPoints)
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
          Call purpose
          <input className="mt-1 w-full rounded-md border border-line px-3 py-2" value={callPurpose} onChange={(event) => setCallPurpose(event.target.value)} />
        </label>
        <label className="text-sm font-medium">
          Request type
          <input className="mt-1 w-full rounded-md border border-line px-3 py-2" value={requestType} onChange={(event) => setRequestType(event.target.value)} />
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
          Address label
          <input className="mt-1 w-full rounded-md border border-line px-3 py-2" value={addressLabel} onChange={(event) => setAddressLabel(event.target.value)} />
        </label>
        <label className="text-sm font-medium md:col-span-2">
          Confirmation checklist
          <textarea
            className="mt-1 min-h-28 w-full rounded-md border border-line px-3 py-2"
            value={confirmationPoints}
            onChange={(event) => setConfirmationPoints(event.target.value)}
          />
        </label>
        <label className="text-sm font-medium md:col-span-2">
          Information to collect
          <textarea
            className="mt-1 min-h-28 w-full rounded-md border border-line px-3 py-2"
            value={collectionPoints}
            onChange={(event) => setCollectionPoints(event.target.value)}
          />
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
    <label className={`${neumorphicRaised} block rounded-[32px] p-5 text-sm font-bold text-[#3D4852]`}>
      Active campaign
      <select className={formControl} value={selectedId} onChange={(event) => onSelect(event.target.value)}>
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
    <section className={`${neumorphicRaised} scroll-mt-6 rounded-[32px] text-[#3D4852]`} id="overview">
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-black">{campaign.name}</h2>
          <span className="rounded-2xl bg-[#6C63FF] px-3 py-2 text-xs font-black text-white">{campaign.status}</span>
          <span className={softChip}>Default: {campaign.default_language}</span>
          <span className={softChip}>Request: {campaign.prompt_config.request_type}</span>
          <span className={softChip}>Concurrency: {campaign.concurrency_limit}</span>
          <span className={softChip}>Voice: {campaign.agent_settings?.voice_preset ?? "indian_female_natural"}</span>
          <span className={softChip}>Tone: {campaign.agent_settings?.tone ?? "warm"}</span>
          <span className={softChip}>Self-improve: {campaign.agent_settings?.self_improve_enabled ? "on" : "off"}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 p-4 pt-0 sm:grid-cols-4 xl:grid-cols-8">
        {metrics.map(([label, value]) => (
          <div className={`${neumorphicInset} rounded-[24px] p-4`} key={label}>
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
  onSave: (
    campaignId: string,
    settings: AgentSettings & {
      company_name: string;
      default_language: string;
      call_purpose: string;
      request_type: string;
      asset_label: string;
      reference_label: string;
      address_label: string;
      confirmation_points: string[];
      collection_points: string[];
    }
  ) => void;
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
      company_name: campaign.company_name,
      default_language: campaign.default_language,
      call_purpose: campaign.prompt_config.call_purpose,
      request_type: campaign.prompt_config.request_type,
      asset_label: campaign.prompt_config.asset_label,
      reference_label: campaign.prompt_config.reference_label,
      address_label: campaign.prompt_config.address_label,
      confirmation_points: campaign.prompt_config.confirmation_points,
      collection_points: campaign.prompt_config.collection_points,
      voice_preset: settings.voice_preset,
      voice_id: settings.voice_id,
      tone: settings.tone,
      prompt_enhancement: promptEnhancement,
      self_improve_enabled: settings.self_improve_enabled
    });
  }

  return (
    <section className={`${neumorphicRaised} scroll-mt-6 rounded-[32px] p-5 text-[#3D4852] sm:p-7`} id="prompt-studio">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-[#38B2AC]">Prompt Studio</p>
          <h2 className="mt-1 text-2xl font-black">Prompt Studio</h2>
          <p className="text-sm text-muted">Edit your operator prompt and preview the blended system prompt for future calls.</p>
        </div>
        <button className={secondaryAction} disabled={busy} onClick={copyPreview} type="button">
          {copied ? "Copied" : "Copy preview"}
        </button>
      </div>
      <form className="mt-4 space-y-3" onSubmit={submit}>
        <label className="block text-sm font-medium">
          Prompt window
          <textarea
            className={`${formControl} min-h-28`}
            maxLength={1200}
            placeholder="Add operational guidance that should blend into the system prompt."
            value={promptEnhancement}
            onChange={(event) => setPromptEnhancement(event.target.value)}
          />
        </label>
        <div className={`${neumorphicInset} rounded-[24px] p-4`}>
          <div className="text-xs text-muted">Blended system prompt preview</div>
          <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap font-sans text-sm">{blendedPromptPreview}</pre>
        </div>
        <div className="flex justify-end">
          <button className={primaryAction} disabled={busy || !canManage}>
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
  onSave: (
    campaignId: string,
    settings: AgentSettings & {
      company_name: string;
      default_language: string;
      call_purpose: string;
      request_type: string;
      asset_label: string;
      reference_label: string;
      address_label: string;
      confirmation_points: string[];
      collection_points: string[];
    }
  ) => void;
}) {
  const settings = campaign.agent_settings ?? defaultAgentSettings;
  const [voicePreset, setVoicePreset] = useState(settings.voice_preset);
  const [voiceId, setVoiceId] = useState(settings.voice_id);
  const [tone, setTone] = useState(settings.tone);
  const [companyName, setCompanyName] = useState(campaign.company_name);
  const [language, setLanguage] = useState(campaign.default_language);
  const [callPurpose, setCallPurpose] = useState(campaign.prompt_config.call_purpose);
  const [requestType, setRequestType] = useState(campaign.prompt_config.request_type);
  const [assetLabel, setAssetLabel] = useState(campaign.prompt_config.asset_label);
  const [referenceLabel, setReferenceLabel] = useState(campaign.prompt_config.reference_label);
  const [addressLabel, setAddressLabel] = useState(campaign.prompt_config.address_label);
  const [confirmationPoints, setConfirmationPoints] = useState(promptChecklistToText(campaign.prompt_config.confirmation_points));
  const [collectionPoints, setCollectionPoints] = useState(promptChecklistToText(campaign.prompt_config.collection_points));
  const [promptEnhancement, setPromptEnhancement] = useState(settings.prompt_enhancement);
  const [selfImprove, setSelfImprove] = useState(settings.self_improve_enabled);

  useEffect(() => {
    const next = campaign.agent_settings ?? defaultAgentSettings;
    setVoicePreset(next.voice_preset);
    setVoiceId(next.voice_id);
    setTone(next.tone);
    setCompanyName(campaign.company_name);
    setLanguage(campaign.default_language);
    setCallPurpose(campaign.prompt_config.call_purpose);
    setRequestType(campaign.prompt_config.request_type);
    setAssetLabel(campaign.prompt_config.asset_label);
    setReferenceLabel(campaign.prompt_config.reference_label);
    setAddressLabel(campaign.prompt_config.address_label);
    setConfirmationPoints(promptChecklistToText(campaign.prompt_config.confirmation_points));
    setCollectionPoints(promptChecklistToText(campaign.prompt_config.collection_points));
    setPromptEnhancement(next.prompt_enhancement);
    setSelfImprove(next.self_improve_enabled);
  }, [campaign.id, campaign.company_name, campaign.default_language, campaign.agent_settings, campaign.prompt_config]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    onSave(campaign.id, {
      company_name: companyName,
      default_language: language,
      call_purpose: callPurpose,
      request_type: requestType,
      asset_label: assetLabel,
      reference_label: referenceLabel,
      address_label: addressLabel,
      confirmation_points: splitChecklistText(confirmationPoints),
      collection_points: splitChecklistText(collectionPoints),
      voice_preset: voicePreset,
      voice_id: resolveVoiceId(voicePreset, voiceId),
      tone,
      prompt_enhancement: promptEnhancement,
      self_improve_enabled: selfImprove
    });
  }

  return (
    <section className={`${neumorphicRaised} scroll-mt-6 rounded-[32px] p-5 text-[#3D4852] sm:p-7`} id="settings">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-[#38B2AC]">Agent Settings</p>
          <h2 className="mt-1 text-2xl font-black">Agent settings</h2>
          <p className="text-sm text-muted">Saved changes apply to future calls only. Prompt guidance is edited in Prompt Studio.</p>
        </div>
        {campaign.self_improvement_notes ? <div className="max-w-xl text-sm text-muted">{campaign.self_improvement_notes}</div> : null}
      </div>
      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={submit}>
        <label className="block text-sm font-medium">
          Company name
          <input className={formControl} value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Voice preset
          <select className={formControl} value={voicePreset} onChange={(event) => setVoicePreset(event.target.value as AgentSettings["voice_preset"])}>
            <option value="indian_female_natural">Indian female natural</option>
            <option value="indian_male_natural">Indian male natural</option>
            <option value="openai_custom">OpenAI custom voice ID</option>
          </select>
        </label>
        <label className="block text-sm font-medium">
          Default language
          <select className={formControl} value={language} onChange={(event) => setLanguage(event.target.value)}>
            {languageOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Call purpose
          <input className={formControl} value={callPurpose} onChange={(event) => setCallPurpose(event.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Request type
          <input className={formControl} value={requestType} onChange={(event) => setRequestType(event.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Asset label
          <input className={formControl} value={assetLabel} onChange={(event) => setAssetLabel(event.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Reference label
          <input className={formControl} value={referenceLabel} onChange={(event) => setReferenceLabel(event.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Address label
          <input className={formControl} value={addressLabel} onChange={(event) => setAddressLabel(event.target.value)} />
        </label>
        {voicePreset === "openai_custom" ? (
          <label className="block text-sm font-medium">
            OpenAI custom voice ID
            <input className={formControl} placeholder="voice_1234" value={voiceId} onChange={(event) => setVoiceId(event.target.value)} />
          </label>
        ) : null}
        {voicePreset === "openai_custom" ? <p className="text-xs text-muted md:col-span-2">Built-in voice IDs: {openAiBuiltInVoices.join(", ")}.</p> : null}
        <label className="block text-sm font-medium">
          Tone
          <select className={formControl} value={tone} onChange={(event) => setTone(event.target.value as AgentSettings["tone"])}>
            <option value="warm">Warm</option>
            <option value="polite">Polite</option>
            <option value="direct">Direct</option>
            <option value="patient">Patient</option>
            <option value="assertive_respectful">Assertive but respectful</option>
          </select>
        </label>
        <input type="hidden" value={promptEnhancement} readOnly />
        <label className="block text-sm font-medium md:col-span-2">
          Confirmations to capture
          <textarea className={`${formControl} min-h-28`} value={confirmationPoints} onChange={(event) => setConfirmationPoints(event.target.value)} />
        </label>
        <label className="block text-sm font-medium md:col-span-2">
          Information to collect
          <textarea className={`${formControl} min-h-28`} value={collectionPoints} onChange={(event) => setCollectionPoints(event.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input checked={selfImprove} type="checkbox" onChange={(event) => setSelfImprove(event.target.checked)} />
          Self-improve future calls from short call notes
        </label>
        <a className="text-sm font-black text-[#6C63FF]" href="#prompt-studio">
          Edit prompt guidance in Prompt Studio
        </a>
        <div className="flex justify-end md:col-span-2">
          <button className={primaryAction} disabled={busy || !canManage}>
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
    <section className={`${neumorphicRaised} scroll-mt-6 rounded-[32px] p-5 text-[#3D4852] sm:p-7`} id="exports">
      <p className="text-xs font-black uppercase tracking-wide text-[#38B2AC]">Downloads</p>
      <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black">Export campaign results</h2>
          <p className="mt-1 text-sm text-muted">Download normal result exports for operations handoff. Raw secrets and provider payloads stay out of these files.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className={primaryAction} href={`/api/campaigns/${campaign.id}/export`}>
            Download CSV
          </a>
          <a className={secondaryAction} href={`/api/campaigns/${campaign.id}/export?format=html`}>
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
  const liveCounts = {
    visible: filteredRows.length,
    selected: filteredRows.filter((row) => selectedContactIds.includes(String(row.contact_id))).length,
    active: filteredRows.filter((row) => ["initiated", "ringing", "answered"].includes(row.call?.status ?? "")).length,
    completed: filteredRows.filter((row) => (row.call?.status ?? "") === "completed").length,
    transcriptReady: filteredRows.filter((row) => (row.call?.transcript_status ?? "missing") !== "missing").length
  };

  return (
    <section className={`${neumorphicRaised} scroll-mt-6 overflow-hidden rounded-[32px] text-[#3D4852]`} id="results">
      <div className="p-5 sm:p-7">
        <p className="text-xs font-black uppercase tracking-wide text-[#38B2AC]">Results</p>
        <h2 className="mt-1 text-2xl font-black">Results and uploaded details</h2>
        <div className={`${neumorphicInset} mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[24px] px-4 py-4`}>
          <div className="text-sm font-semibold">
            {selectedContactIds.length > 0
              ? `${selectedContactIds.length} contact${selectedContactIds.length === 1 ? "" : "s"} selected for start`
              : "Select uploaded contacts here, then start only those calls."}
          </div>
          <div className="flex flex-wrap gap-2">
            {canManage ? (
              <button
                className={secondaryAction}
                disabled={busy || visibleContactIds.length === 0}
                onClick={() => onToggleAll(visibleContactIds)}
                type="button"
              >
                {everyVisibleSelected ? "Clear visible" : "Select visible"}
              </button>
            ) : null}
            {canManage ? (
              <button
                className={primaryAction}
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
            <select className={formControl} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
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
            <select className={formControl} value={dispositionFilter} onChange={(event) => setDispositionFilter(event.target.value)}>
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
            <select className={formControl} value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value)}>
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
            <select className={formControl} value={qaFilter} onChange={(event) => setQaFilter(event.target.value)}>
              <option value="all">All QA scores</option>
              <option value="pass">Pass</option>
              <option value="warn">Warn</option>
              <option value="fail">Fail</option>
              <option value="none">No score</option>
            </select>
          </label>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-5">
          {[
            ["Visible rows", liveCounts.visible],
            ["Selected", liveCounts.selected],
            ["Calling now", liveCounts.active],
            ["Completed", liveCounts.completed],
            ["Transcript ready", liveCounts.transcriptReady]
          ].map(([label, value]) => (
            <div className={`${neumorphicInset} rounded-[24px] px-4 py-4`} key={String(label)}>
              <div className="text-xs font-bold uppercase tracking-wide text-muted">{label}</div>
              <div className="mt-1 text-2xl font-black">{value}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3 p-4">
        {filteredRows.length === 0 ? <div className="py-4 text-center text-sm text-muted">No results match the current filters.</div> : null}
        {filteredRows.map((row, index) => {
          const rowStatus = row.call?.status ?? "not_queued";
          const selectedForStart = selectedContactIds.includes(String(row.contact_id));
          return (
            <article className={`${neumorphicRaisedSmall} rounded-[28px] p-4 ${resolveRowHighlight(rowStatus)}`} key={String(row.contact_id)}>
              <div className="grid gap-4 lg:grid-cols-[52px_minmax(0,1.5fr)_minmax(280px,1fr)]">
                <div className="flex items-start justify-center pt-1">
                  {canManage ? (
                    <input
                      aria-label={`Select ${String(row.provider_name ?? "contact")}`}
                      checked={selectedForStart}
                      className="mt-1 h-5 w-5"
                      onChange={() => onToggleContact(String(row.contact_id))}
                      type="checkbox"
                    />
                  ) : (
                    <span className="text-xs font-bold text-muted">#{index + 1}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className={`text-lg ${rowStatus === "completed" ? "font-black text-green-700" : "font-black text-ink"}`}>{String(row.provider_name ?? "Unnamed contact")}</h3>
                    <span className={softChip}>{String(row.language_hint ?? "-")}</span>
                    {row.call ? <QaBadge call={row.call} /> : null}
                  </div>
                  <div className="mt-1 font-mono text-sm text-muted">{String(row.phone ?? "")}</div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <InfoField label="Location" value={String(row.location ?? "-")} />
                    <InfoField label="Address" value={String(row.address ?? "-")} />
                    <InfoField label="Order / reference" value={String(row.order_id ?? "-")} />
                    <InfoField label="Detected language" value={row.call?.detected_language ?? "-"} />
                    <InfoField label="Disposition" value={row.call?.disposition ?? "unknown"} />
                    <InfoField label="Next action" value={row.call?.next_action ?? "none"} />
                    <InfoField label="Last update" value={formatDateTime(row.call?.last_call_time)} />
                    <InfoField label="Callback at" value={formatDateTime(row.call?.callback_requested_at)} />
                    <InfoField label="Summary" value={row.call?.summary_text || "No remarks yet."} />
                  </div>
                </div>
                <div className={`${neumorphicInset} rounded-[24px] p-4`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-muted">Live status</div>
                      <div className="mt-2">
                        <StatusBadge status={rowStatus} />
                      </div>
                    </div>
                    {selectedForStart ? <span className="rounded-2xl bg-[#6C63FF] px-3 py-2 text-xs font-black text-white">Selected</span> : null}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <LiveStateChip label={resolveTranscriptLabel(row.call?.transcript_status)} tone={(row.call?.transcript_status ?? "missing") === "missing" ? "neutral" : "good"} />
                    <LiveStateChip label={row.call?.recording_url ? "Recording ready" : "Recording pending"} tone={row.call?.recording_url ? "good" : "neutral"} />
                    <LiveStateChip label={row.call ? `Attitude: ${row.call.receiver_attitude}` : "Awaiting call"} tone={row.call?.receiver_attitude === "rude" ? "warn" : "neutral"} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    {row.call ? <a className="font-black text-[#6C63FF]" href={`/campaigns/calls/${row.call.id}`}>Open detail</a> : null}
                    {row.call?.recording_url ? <a className="font-black text-[#6C63FF]" href={row.call.recording_url}>Open recording</a> : <span className="text-muted">Recording pending</span>}
                    {row.call?.transcript_text ? (
                      <button className="font-black text-[#6C63FF]" onClick={() => onDownloadTranscript(row.call!)} type="button">
                        Download transcript
                      </button>
                    ) : null}
                  </div>
                  {row.call?.status_history?.length ? (
                    <div className={`${neumorphicRaisedSmall} mt-4 rounded-[20px] p-3`}>
                      <div className="text-xs font-bold uppercase tracking-wide text-muted">Status trail</div>
                      <ol className="mt-2 space-y-1 text-sm">
                        {row.call.status_history.slice(-4).map((item, itemIndex) => (
                          <li key={`${item.status}-${item.at}-${itemIndex}`}>
                            <span className="font-semibold">{item.status}</span> <span className="text-muted">{formatDateTime(item.at)}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                </div>
              </div>
              {row.call ? <CallHistoryDetails call={row.call} /> : null}
            </article>
          );
        })}
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
  return <span className={`rounded-2xl px-3 py-2 text-xs font-black ${resolveStatusBadgeClassName(status)}`}>{status.replace(/_/g, " ")}</span>;
}

function LiveStateChip({ label, tone }: { label: string; tone: "good" | "warn" | "neutral" }) {
  const className =
    tone === "good"
      ? "border-green-300 bg-green-100 text-green-800"
      : tone === "warn"
        ? "border-amber-300 bg-amber-100 text-amber-800"
        : "border-[#D1D8E0] bg-[#E0E5EC] text-[#3D4852]";

  return <span className={`rounded-2xl border px-3 py-2 text-xs font-bold ${className}`}>{label}</span>;
}

function resolveStatusBadgeClassName(status: string) {
  if (status === "completed") return "bg-success text-white";
  if (status === "ringing" || status === "initiated" || status === "answered") return "bg-[#6C63FF] text-white";
  if (status === "queued") return "bg-[#E0E5EC] text-[#3D4852] shadow-[inset_3px_3px_6px_rgb(163,177,198,0.6),inset_-3px_-3px_6px_rgba(255,255,255,0.5)]";
  if (status === "not_picked" || status === "not_connected" || status === "voicemail") return "bg-amber-100 text-amber-800";
  if (status === "invalid_number" || status === "failed") return "bg-red-100 text-red-700";
  return "bg-[#E0E5EC] text-[#3D4852] shadow-[inset_3px_3px_6px_rgb(163,177,198,0.6),inset_-3px_-3px_6px_rgba(255,255,255,0.5)]";
}

function resolveRowHighlight(status: string) {
  if (status === "completed") return "ring-2 ring-green-300";
  return "";
}

function resolveTableRowHighlight(status: string) {
  if (status === "completed") return "border-line bg-green-50 font-semibold";
  return "border-line";
}

function CallHistoryDetails({ call }: { call: Campaign["calls"][number] }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer font-medium text-[#6C63FF]">Call history and transcript</summary>
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
      <div className={`${neumorphicInset} mt-3 rounded-[20px] p-3`}>
        <div className="text-xs text-muted">Behavior verification</div>
        <div className="mt-2 grid gap-2 md:grid-cols-4">
          <InfoField label="Language QA" value={call.qa_language_status ?? "warn"} />
          <InfoField label="Tone QA" value={call.qa_tone_status ?? "warn"} />
          <InfoField label="QA score" value={String(call.qa_score ?? 0)} />
          <InfoField label="Summary" value={call.qa_notes ?? "No QA notes yet."} />
        </div>
      </div>
      {call.prompt_enhancement_snapshot ? (
        <div className={`${neumorphicInset} mt-3 rounded-[20px] p-3`}>
          <div className="text-xs text-muted">Prompt enhancement snapshot</div>
          <div className="mt-1 whitespace-pre-wrap">{call.prompt_enhancement_snapshot}</div>
        </div>
      ) : null}
      <div className={`${neumorphicInset} mt-3 rounded-[20px] p-3`}>
        <div className="text-xs text-muted">Transcript text</div>
        <pre className="mt-1 whitespace-pre-wrap font-sans text-sm">{call.transcript_text || "Transcript pending."}</pre>
      </div>
      <div className={`${neumorphicInset} mt-3 rounded-[20px] p-3`}>
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
        <div className={`${neumorphicInset} mt-3 rounded-[20px] p-3`}>
          <div className="text-xs text-muted">Self-improvement note</div>
          <div className="mt-1">{call.improvement_note}</div>
        </div>
      ) : null}
    </details>
  );
}

function QaBadge({ call, compact = false }: { call: Campaign["calls"][number]; compact?: boolean }) {
  if ((call.transcript_status ?? "missing") === "missing") {
    return <span className={`${softChip} inline-flex`}>QA pending</span>;
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

  return <span className={`inline-flex rounded-2xl border px-3 py-2 text-xs font-medium ${className}`}>{compact ? score : label}</span>;
}

function UploadSummaryPanel({ summary }: { summary: UploadSummary }) {
  return (
    <section className={`${neumorphicRaised} rounded-[32px] p-5`}>
      <div className="flex flex-wrap gap-2 text-xs">
        {summary.source_columns.map((column) => (
          <span className={softChip} key={column}>{column}</span>
        ))}
      </div>
      {summary.invalid_rows.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-sm font-semibold">Invalid rows</h3>
          <div className="mt-2 space-y-2">
            {summary.invalid_rows.slice(0, 5).map((row) => (
              <div className={`${neumorphicInset} rounded-[20px] p-3 text-sm`} key={`invalid-${row.source_row_number}`}>
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
              <div className={`${neumorphicInset} rounded-[20px] p-3 text-sm`} key={`duplicate-${row.source_row_number}`}>
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
    <section className={`${neumorphicInset} rounded-[32px] p-8 text-center`}>
      <h2 className="text-lg font-semibold">No campaign yet</h2>
      <p className="mt-2 text-sm text-muted">Upload an Excel or CSV contact list to begin the live operations workflow.</p>
    </section>
  );
}
