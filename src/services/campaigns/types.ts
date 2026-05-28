import type { CallStatus, Disposition, NextAction } from "@/domain/calls";
import type { LanguageCode } from "@/domain/languages";
import type { AgentSettings, AgentTone, BehaviorQaStatus, ReceiverAttitude, VoicePreset } from "@/domain/voice-agent";
import type { ParsedContact } from "@/services/ingestion/types";

export type CampaignStatus = "draft" | "running" | "completed";

export type PromptConfig = {
  asset_label: string;
  reference_label: string;
  account_label: string;
  account_name: string;
};

export type ContactRecord = ParsedContact & {
  id: string;
  campaign_id: string;
};

export type CallRecord = {
  id: string;
  campaign_id: string;
  contact_id: string;
  status: CallStatus;
  disposition: Disposition;
  next_action: NextAction;
  attempt_number: number;
  transcript_text: string;
  transcript_status: "missing" | "simulated" | "realtime";
  summary_text: string;
  reason_code: string | null;
  confidence: number;
  detected_language: string;
  recording_url: string;
  retry_eligible: boolean;
  last_call_time: string | null;
  provider_call_id: string | null;
  voice_preset_snapshot: VoicePreset;
  voice_id_snapshot: string;
  tone_snapshot: AgentTone;
  prompt_enhancement_snapshot: string;
  receiver_attitude: ReceiverAttitude;
  receiver_attitude_confidence: number;
  qa_language_status: BehaviorQaStatus;
  qa_tone_status: BehaviorQaStatus;
  qa_score: number;
  qa_notes: string;
  improvement_note: string;
  status_history: Array<{
    status: CallStatus;
    at: string;
    note: string;
  }>;
  updated_at: string;
};

export type CallEventRecord = {
  id: string;
  campaign_id: string;
  call_id: string;
  provider: Campaign["provider"];
  event_type: string;
  provider_event_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

export type Campaign = {
  id: string;
  name: string;
  company_name: string;
  prompt_config: PromptConfig;
  agent_settings: AgentSettings;
  self_improvement_notes: string;
  provider: "simulated" | "plivo" | "twilio" | "exotel";
  status: CampaignStatus;
  default_language: LanguageCode;
  retry_limit: number;
  concurrency_limit: number;
  created_at: string;
  contacts: ContactRecord[];
  calls: CallRecord[];
  call_events: CallEventRecord[];
};

export type CampaignStats = {
  totalContacts: number;
  queued: number;
  active: number;
  completed: number;
  confirmedPickup: number;
  followUpNeeded: number;
  manualReview: number;
  invalidNumbers: number;
  retryEligible: number;
};
