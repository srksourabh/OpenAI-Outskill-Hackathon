import type { CallStatus, Disposition, NextAction } from "@/domain/calls";
import type { LanguageCode } from "@/domain/languages";
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
  detected_language: string;
  recording_url: string;
  retry_eligible: boolean;
  last_call_time: string | null;
  provider_call_id: string | null;
  updated_at: string;
};

export type Campaign = {
  id: string;
  name: string;
  company_name: string;
  prompt_config: PromptConfig;
  provider: "simulated" | "plivo" | "twilio" | "exotel";
  status: CampaignStatus;
  default_language: LanguageCode;
  retry_limit: number;
  concurrency_limit: number;
  created_at: string;
  contacts: ContactRecord[];
  calls: CallRecord[];
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
