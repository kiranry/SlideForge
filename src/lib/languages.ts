/** Supported output languages (PRD 7.7 — 20+). */

export interface LanguageOption {
  value: string;
  label: string;
  nativeName?: string;
  rtl?: boolean;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish", nativeName: "Español" },
  { value: "fr", label: "French", nativeName: "Français" },
  { value: "de", label: "German", nativeName: "Deutsch" },
  { value: "pt", label: "Portuguese", nativeName: "Português" },
  { value: "it", label: "Italian", nativeName: "Italiano" },
  { value: "nl", label: "Dutch", nativeName: "Nederlands" },
  { value: "pl", label: "Polish", nativeName: "Polski" },
  { value: "ru", label: "Russian", nativeName: "Русский" },
  { value: "uk", label: "Ukrainian", nativeName: "Українська" },
  { value: "ar", label: "Arabic", nativeName: "العربية", rtl: true },
  { value: "he", label: "Hebrew", nativeName: "עברית", rtl: true },
  { value: "fa", label: "Persian", nativeName: "فارسی", rtl: true },
  { value: "hi", label: "Hindi", nativeName: "हिन्दी" },
  { value: "bn", label: "Bengali", nativeName: "বাংলা" },
  { value: "ja", label: "Japanese", nativeName: "日本語" },
  { value: "ko", label: "Korean", nativeName: "한국어" },
  { value: "zh", label: "Chinese (Simplified)", nativeName: "简体中文" },
  { value: "zh-TW", label: "Chinese (Traditional)", nativeName: "繁體中文" },
  { value: "th", label: "Thai", nativeName: "ไทย" },
  { value: "vi", label: "Vietnamese", nativeName: "Tiếng Việt" },
  { value: "id", label: "Indonesian", nativeName: "Bahasa Indonesia" },
  { value: "tr", label: "Turkish", nativeName: "Türkçe" },
  { value: "sv", label: "Swedish", nativeName: "Svenska" },
];

export const RTL_LANGUAGES = new Set(
  LANGUAGE_OPTIONS.filter((l) => l.rtl).map((l) => l.value)
);

export function isRtlLanguage(code: string): boolean {
  return RTL_LANGUAGES.has(code) || code.startsWith("ar");
}
