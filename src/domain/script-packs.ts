import type { LanguageCode } from "./languages";

export type ScriptPack = {
  language: LanguageCode;
  greeting: string;
  context: string;
  readinessQuestion: string;
  positiveClose: string;
  negativeFollowUp: string;
};

export const scriptPacks: Record<"hi" | "en", ScriptPack> = {
  hi: {
    language: "hi",
    greeting: "Namaste, main UDS ki taraf se call kar raha/rahi hoon.",
    context: "Aapke location par machine pickup ya de-installation request ke baare mein baat karni thi.",
    readinessQuestion: "Kya machine abhi aapke paas hai aur pickup ya engineer visit ke liye ready hai?",
    positiveClose: "Dhanyavaad, hum engineer dispatch ke liye status update kar denge.",
    negativeFollowUp: "Theek hai, kripya bataiye kab callback karna behtar rahega."
  },
  en: {
    language: "en",
    greeting: "Hello, I am calling from UDS.",
    context: "I am calling about the machine pickup or de-installation request for your location.",
    readinessQuestion: "Can you confirm whether the machine is with you and ready for pickup or engineer visit?",
    positiveClose: "Thank you, we will update the status for engineer dispatch.",
    negativeFollowUp: "Understood. Please share when we should call back."
  }
};
