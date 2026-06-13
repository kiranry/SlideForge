"use client";

import {
  deleteDeckImage,
  getDeckImage,
  putDeckImage,
} from "@/lib/image-store";
import type { SlideImage, StoredDeck } from "@/lib/types";

const LOGO_REF = "logo";

function isDataUrl(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith("data:");
}

function slideImageRef(slideIndex: number): string {
  return `slide-${slideIndex}`;
}

/** Persist inline data URLs to IndexedDB and return a JSON-safe deck copy. */
export async function stripDeckMedia(deck: StoredDeck): Promise<StoredDeck> {
  const manifest = {
    ...deck.manifest,
    slides: deck.manifest.slides.map((slide, i) => {
      if (!slide.image?.dataUrl || !isDataUrl(slide.image.dataUrl)) {
        return slide;
      }
      const ref = slide.image.imageRef ?? slideImageRef(i);
      return {
        ...slide,
        image: {
          ...slide.image,
          imageRef: ref,
          dataUrl: undefined,
        },
      };
    }),
  };

  const stripped: StoredDeck = {
    ...deck,
    manifest,
    logoDataUrl: deck.logoRef ? undefined : deck.logoDataUrl,
  };

  for (let i = 0; i < deck.manifest.slides.length; i++) {
    const image = deck.manifest.slides[i].image;
    if (image?.dataUrl && isDataUrl(image.dataUrl)) {
      const ref = image.imageRef ?? slideImageRef(i);
      await putDeckImage(deck.id, ref, image.dataUrl);
    }
  }

  if (isDataUrl(deck.logoDataUrl)) {
    await putDeckImage(deck.id, LOGO_REF, deck.logoDataUrl!);
    stripped.logoRef = LOGO_REF;
    stripped.logoDataUrl = undefined;
  }

  return stripped;
}

async function hydrateSlideImage(
  deckId: string,
  image: SlideImage
): Promise<SlideImage> {
  if (image.dataUrl) return image;
  if (!image.imageRef) return image;
  const dataUrl = await getDeckImage(deckId, image.imageRef);
  if (!dataUrl) return image;
  return { ...image, dataUrl };
}

/** Load image blobs from IndexedDB into runtime data URLs. */
export async function hydrateDeckMedia(deck: StoredDeck): Promise<StoredDeck> {
  const slides = await Promise.all(
    deck.manifest.slides.map(async (slide, i) => {
      if (!slide.image) return slide;
      const hydrated = await hydrateSlideImage(deck.id, slide.image);
      // Legacy decks may still have inline dataUrl in localStorage.
      if (hydrated.dataUrl && isDataUrl(hydrated.dataUrl) && !hydrated.imageRef) {
        return {
          ...slide,
          image: { ...hydrated, imageRef: slideImageRef(i) },
        };
      }
      return { ...slide, image: hydrated };
    })
  );

  let logoDataUrl = deck.logoDataUrl;
  if (!logoDataUrl && deck.logoRef) {
    logoDataUrl = await getDeckImage(deck.id, deck.logoRef);
  }

  return {
    ...deck,
    manifest: { ...deck.manifest, slides },
    logoDataUrl: logoDataUrl ?? null,
  };
}

/** Remove slide image from IndexedDB when image is cleared or slide deleted. */
export async function removeSlideImageFromStore(
  deckId: string,
  slideIndex: number,
  image?: SlideImage | null
): Promise<void> {
  const ref = image?.imageRef ?? slideImageRef(slideIndex);
  await deleteDeckImage(deckId, ref);
}
