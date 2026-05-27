export const supportedLanguageCodes = ["hi", "en", "bn", "pa", "gu", "mr", "ta", "te", "ml", "kn", "or", "as"] as const;

export type LanguageCode = (typeof supportedLanguageCodes)[number];

export const languageLabels: Record<LanguageCode, string> = {
  hi: "Hindi",
  en: "English",
  bn: "Bengali",
  pa: "Punjabi",
  gu: "Gujarati",
  mr: "Marathi",
  ta: "Tamil",
  te: "Telugu",
  ml: "Malayalam",
  kn: "Kannada",
  or: "Odia",
  as: "Assamese"
};

export function isSupportedLanguage(value: string | undefined | null): value is LanguageCode {
  return supportedLanguageCodes.includes(value as LanguageCode);
}

export function getEffectiveLanguage(rowLanguage: string | undefined | null, campaignDefault: string | undefined | null): LanguageCode {
  if (isSupportedLanguage(rowLanguage)) return rowLanguage;
  if (isSupportedLanguage(campaignDefault)) return campaignDefault;
  return "hi";
}
