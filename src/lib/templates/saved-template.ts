import type {
  Audience,
  ChartType,
  ParsedData,
  SlideManifest,
  Tone,
} from "@/lib/types";

export const SAVED_TEMPLATE_KINDS = [
  "prompt",
  "weekly_report",
  "skeleton",
] as const;

export type SavedTemplateKind = (typeof SAVED_TEMPLATE_KINDS)[number];

export interface TemplateChartBinding {
  x_col: string;
  y_cols: string[];
  type: ChartType;
}

export interface TemplateTableBinding {
  columns: string[];
}

export interface TemplateBinding {
  slideIndex: number;
  sheet: string;
  chart?: TemplateChartBinding;
  table?: TemplateTableBinding;
}

export interface SavedDeckTemplate {
  id: string;
  name: string;
  kind: SavedTemplateKind;
  createdAt: string;
  /** Deck this template was saved from (optional). */
  sourceDeckId?: string;
  bindings?: TemplateBinding[];
  skeletonManifest?: SlideManifest;
  theme: string;
  tone?: Tone;
  audience?: Audience;
}

export interface BindingIssue {
  slideIndex: number;
  field: string;
  expected: string;
  suggestions: string[];
}

export interface ApplyTemplateOptions {
  template: SavedDeckTemplate;
  data: ParsedData;
  /** Manual overrides: expected column/sheet name → actual name in new data. */
  columnMappings?: Record<string, string>;
  sheetMappings?: Record<string, string>;
}

export interface ApplyTemplateResult {
  manifest: SlideManifest;
  issues: BindingIssue[];
}
