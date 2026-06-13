import { z } from "zod";
import {
  audienceSchema,
  chartTypeSchema,
  slideManifestSchema,
  toneSchema,
} from "@/lib/schema";
import { SAVED_TEMPLATE_KINDS } from "@/lib/templates/saved-template";

export const templateChartBindingSchema = z.object({
  x_col: z.string(),
  y_cols: z.array(z.string()),
  type: chartTypeSchema,
});

export const templateTableBindingSchema = z.object({
  columns: z.array(z.string()),
});

export const templateBindingSchema = z.object({
  slideIndex: z.number().int().nonnegative(),
  sheet: z.string(),
  chart: templateChartBindingSchema.optional(),
  table: templateTableBindingSchema.optional(),
});

export const savedDeckTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(SAVED_TEMPLATE_KINDS),
  createdAt: z.string(),
  sourceDeckId: z.string().optional(),
  bindings: z.array(templateBindingSchema).optional(),
  skeletonManifest: slideManifestSchema.optional(),
  theme: z.string(),
  tone: toneSchema.optional(),
  audience: audienceSchema.optional(),
});
