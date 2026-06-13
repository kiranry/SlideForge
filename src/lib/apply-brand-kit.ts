import type { BrandKit } from "@/lib/brand-kit";
import { setLastUsedBrandKitId } from "@/lib/brand-kit-storage";
import { useBuilderStore } from "@/lib/store";

/** Apply a brand kit to the builder store and remember as last used. */
export function applyBrandKitToBuilder(kit: BrandKit): void {
  const store = useBuilderStore.getState();
  store.setCustomTheme(kit.palette);
  store.setBrandKitId(kit.id);
  store.setHeadingFont(kit.headingFont ?? "Calibri");
  store.setBodyFont(kit.bodyFont ?? "Calibri");
  store.setChartColors(kit.chartColors ?? null);
  if (kit.logoDataUrl) store.setLogoDataUrl(kit.logoDataUrl);
  store.setLogoOnAllSlides(kit.logoOnAllSlides ?? false);
  setLastUsedBrandKitId(kit.id);
}
