import { getAgentSettings, getPromptConfig, type AgentSettingsInput } from "@/domain/voice-agent";

type QuickCheckCampaignDefaults = {
  company_name?: string;
  default_language?: string;
  provider?: string;
  prompt_config?: Parameters<typeof getPromptConfig>[0];
  agent_settings?: AgentSettingsInput;
};

type QuickCheckFormInput = {
  phone?: string;
  phones?: string[];
  language: string;
  provider: string;
  companyName: string;
  promptConfig: ReturnType<typeof getPromptConfig>;
  agentSettings: ReturnType<typeof getAgentSettings>;
  campaignName?: string;
  concurrencyLimit?: number;
};

const fallbackPromptConfig = {
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

const fallbackAgentSettings = {
  voice_preset: "indian_female_natural",
  voice_id: "marin",
  tone: "warm",
  prompt_enhancement: "",
  self_improve_enabled: false
} as const;

export function resolveQuickCheckDefaults(campaign?: QuickCheckCampaignDefaults | null) {
  const promptConfig = getPromptConfig(campaign?.prompt_config);

  return {
    companyName: campaign?.company_name?.trim() || fallbackPromptConfig.companyName,
    promptConfig,
    agentSettings: getAgentSettings(campaign?.agent_settings ?? fallbackAgentSettings),
    language: campaign?.default_language || "hi",
    provider: campaign?.provider === "plivo" ? "plivo" : "simulated"
  };
}

export function buildQuickCheckFormData(input: QuickCheckFormInput) {
  const selectedPhones = collectPhones(input);
  const campaignName = input.campaignName?.trim() || (selectedPhones.length > 1 ? "Manual number list check" : "Manual number check");
  const formData = new FormData();
  formData.set("campaign_name", campaignName);
  formData.set("company_name", input.companyName);
  formData.set("call_purpose", input.promptConfig.call_purpose);
  formData.set("request_type", input.promptConfig.request_type);
  formData.set("asset_label", input.promptConfig.asset_label);
  formData.set("reference_label", input.promptConfig.reference_label);
  formData.set("address_label", input.promptConfig.address_label);
  formData.set("confirmation_points", input.promptConfig.confirmation_points.join("\n"));
  formData.set("collection_points", input.promptConfig.collection_points.join("\n"));
  formData.set("voice_preset", input.agentSettings.voice_preset);
  formData.set("voice_id", resolveVoiceIdForPreset(input.agentSettings.voice_preset, input.agentSettings.voice_id));
  formData.set("tone", input.agentSettings.tone);
  formData.set("prompt_enhancement", input.agentSettings.prompt_enhancement);
  formData.set("self_improve_enabled", String(input.agentSettings.self_improve_enabled));
  formData.set("default_language", input.language);
  formData.set("concurrency_limit", String(clampConcurrencyLimit(input.concurrencyLimit, selectedPhones.length)));
  formData.set("provider", input.provider);
  formData.set("file", buildManualUploadFile({ phones: selectedPhones, language: input.language }));
  return formData;
}

export function buildManualUploadFile({ phone, phones, language }: { phone?: string; phones?: string[]; language: string }) {
  const selectedPhones = collectPhones({ phone, phones });
  const rows = selectedPhones.map((selectedPhone, index) =>
    [
      escapeCsvValue(selectedPhone),
      escapeCsvValue(language),
      escapeCsvValue(selectedPhones.length > 1 ? `Quick check contact ${index + 1}` : "Quick check contact"),
      escapeCsvValue("Manual test"),
      "1",
      escapeCsvValue(`MANUAL-${Date.now()}-${index + 1}`)
    ].join(",")
  );

  const csv = ["phone,language_hint,provider_name,location,machine_count,order_id", ...rows].join("\n");

  return new File([csv], "manual-number-check.csv", { type: "text/csv" });
}

export function parsePhoneList(input: string) {
  return input
    .split(/[\n,;]+/)
    .map((value) => normalizePhoneInput(value))
    .filter(Boolean);
}

function collectPhones(input: { phone?: string; phones?: string[] }) {
  const fromList = (input.phones ?? []).map((value) => normalizePhoneInput(value)).filter(Boolean);
  if (fromList.length > 0) {
    return Array.from(new Set(fromList));
  }

  const single = normalizePhoneInput(input.phone ?? "");
  return single ? [single] : [];
}

function normalizePhoneInput(value: string) {
  return value.trim().replace(/\s+/g, "");
}

function resolveVoiceIdForPreset(voicePreset: ReturnType<typeof getAgentSettings>["voice_preset"], voiceId: string) {
  if (voicePreset === "indian_female_natural") return "marin";
  if (voicePreset === "indian_male_natural") return "cedar";
  return voiceId.trim() || "marin";
}

function clampConcurrencyLimit(requestedLimit: number | undefined, contactsCount: number) {
  const fallback = contactsCount > 1 ? Math.min(5, contactsCount) : 1;
  const raw = requestedLimit ?? fallback;
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(25, Math.max(1, Math.floor(raw)));
}

function escapeCsvValue(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }
  return value;
}
