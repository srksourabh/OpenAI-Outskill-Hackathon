import { getAgentSettings, getPromptConfig, type AgentSettingsInput } from "@/domain/voice-agent";

type QuickCheckCampaignDefaults = {
  company_name?: string;
  default_language?: string;
  provider?: string;
  prompt_config?: Parameters<typeof getPromptConfig>[0];
  agent_settings?: AgentSettingsInput;
};

type QuickCheckFormInput = {
  phone: string;
  language: string;
  provider: string;
  companyName: string;
  promptConfig: ReturnType<typeof getPromptConfig>;
  agentSettings: ReturnType<typeof getAgentSettings>;
};

const fallbackPromptConfig = {
  companyName: "UDS",
  assetLabel: "POS machine",
  referenceLabel: "POS machine number",
  accountLabel: "company/bank",
  accountName: ""
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
    language: campaign?.default_language || "en",
    provider: campaign?.provider === "simulated" ? "simulated" : "plivo"
  };
}

export function buildQuickCheckFormData(input: QuickCheckFormInput) {
  const formData = new FormData();
  formData.set("campaign_name", "Manual number check");
  formData.set("company_name", input.companyName);
  formData.set("asset_label", input.promptConfig.asset_label);
  formData.set("reference_label", input.promptConfig.reference_label);
  formData.set("account_label", input.promptConfig.account_label);
  formData.set("account_name", input.promptConfig.account_name);
  formData.set("voice_preset", input.agentSettings.voice_preset);
  formData.set("voice_id", input.agentSettings.voice_id);
  formData.set("tone", input.agentSettings.tone);
  formData.set("prompt_enhancement", input.agentSettings.prompt_enhancement);
  formData.set("self_improve_enabled", String(input.agentSettings.self_improve_enabled));
  formData.set("default_language", input.language);
  formData.set("concurrency_limit", "1");
  formData.set("provider", input.provider);
  formData.set("file", buildManualUploadFile({ phone: input.phone, language: input.language }));
  return formData;
}

export function buildManualUploadFile({ phone, language }: { phone: string; language: string }) {
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
