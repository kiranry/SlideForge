import type { Audience, Tone } from "@/lib/types";

export const TONE_OPTIONS: { value: Tone; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "academic", label: "Academic" },
  { value: "sales", label: "Sales" },
  { value: "technical", label: "Technical" },
];

export const AUDIENCE_OPTIONS: { value: Audience; label: string }[] = [
  { value: "executive", label: "Executive" },
  { value: "general", label: "General" },
  { value: "technical", label: "Technical" },
  { value: "investor", label: "Investor" },
];

export const SLIDE_COUNT_PRESETS = [5, 10, 15];

export { LANGUAGE_OPTIONS } from "@/lib/languages";
