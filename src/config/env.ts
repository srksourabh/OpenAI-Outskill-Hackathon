import { z } from "zod";
import { getEffectiveLanguage } from "@/domain/languages";

const envSchema = z.object({
  APP_ENV: z.string().default("development"),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  ADMIN_API_KEY: z.string().optional(),
  SESSION_SECRET: z.string().optional(),
  AUTH_ADMIN_EMAIL: z.string().email().optional(),
  AUTH_ADMIN_PASSWORD: z.string().optional(),
  AUTH_USER_EMAIL: z.string().email().optional(),
  AUTH_USER_PASSWORD: z.string().optional(),
  VOICE_BRIDGE_PUBLIC_WS_URL: z.string().url().default("wss://replace-with-voice-bridge-host/plivo/audio-stream"),
  VOICE_OUTCOME_SECRET: z.string().default("replace-with-voice-outcome-secret"),
  CRON_SECRET: z.string().default("replace-with-local-placeholder"),
  DATABASE_URL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_RESPONSES_MODEL: z.string().default("gpt-4.1-mini"),
  OPENAI_REALTIME_MODEL: z.string().default("gpt-realtime-2"),
  OPENAI_REALTIME_VOICE: z.string().default("marin"),
  OPENAI_REALTIME_FALLBACK_VOICE: z.string().default("cedar"),
  PRIMARY_CALL_LANGUAGE: z.string().default("hi"),
  SUPPORTED_CALL_LANGUAGES: z.string().default("hi,en,bn,pa,gu,mr,ta,te,ml,kn,or,as"),
  TELEPHONY_PROVIDER: z.string().default("plivo"),
  PLIVO_AUTH_ID: z.string().optional(),
  PLIVO_AUTH_TOKEN: z.string().optional(),
  PLIVO_NUMBER: z.string().optional(),
  PLIVO_WEBHOOK_SECRET: z.string().optional()
});

export function parseEnv(input: NodeJS.ProcessEnv) {
  const parsed = envSchema.parse(input);
  return {
    appEnv: parsed.APP_ENV,
    appBaseUrl: parsed.APP_BASE_URL,
    adminApiKey: parsed.ADMIN_API_KEY,
    sessionSecret: parsed.SESSION_SECRET,
    authAdminEmail: parsed.AUTH_ADMIN_EMAIL,
    authAdminPassword: parsed.AUTH_ADMIN_PASSWORD,
    authUserEmail: parsed.AUTH_USER_EMAIL,
    authUserPassword: parsed.AUTH_USER_PASSWORD,
    voiceBridgePublicWsUrl: parsed.VOICE_BRIDGE_PUBLIC_WS_URL,
    voiceOutcomeSecret: parsed.VOICE_OUTCOME_SECRET,
    cronSecret: parsed.CRON_SECRET,
    databaseUrl: parsed.DATABASE_URL,
    openaiApiKey: parsed.OPENAI_API_KEY,
    openaiResponsesModel: parsed.OPENAI_RESPONSES_MODEL,
    openaiRealtimeModel: parsed.OPENAI_REALTIME_MODEL,
    openaiRealtimeVoice: parsed.OPENAI_REALTIME_VOICE,
    openaiRealtimeFallbackVoice: parsed.OPENAI_REALTIME_FALLBACK_VOICE,
    primaryCallLanguage: getEffectiveLanguage(parsed.PRIMARY_CALL_LANGUAGE, "hi"),
    supportedCallLanguages: parsed.SUPPORTED_CALL_LANGUAGES.split(",").map((item) => item.trim()),
    telephonyProvider: parsed.TELEPHONY_PROVIDER,
    plivoAuthId: parsed.PLIVO_AUTH_ID,
    plivoAuthToken: parsed.PLIVO_AUTH_TOKEN,
    plivoNumber: parsed.PLIVO_NUMBER,
    plivoWebhookSecret: parsed.PLIVO_WEBHOOK_SECRET
  };
}

export const env = parseEnv(process.env);
