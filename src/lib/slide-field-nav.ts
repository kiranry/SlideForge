/** Root container for slide inline editing (preview mode). */
export const SLIDE_EDIT_ROOT_ATTR = "data-slide-edit-root";

/** Marks a focusable editable field inside the slide canvas. */
export const EDITABLE_FIELD_ATTR = "data-editable-field";

function placeCaretAtEnd(el: HTMLElement) {
  if (!el.isContentEditable) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

/** Move focus to the next/previous editable field on the slide (Tab / Shift+Tab). */
export function focusAdjacentEditableField(
  current: HTMLElement,
  direction: -1 | 1
): boolean {
  const root = current.closest(`[${SLIDE_EDIT_ROOT_ATTR}]`);
  if (!root) return false;

  const list = Array.from(
    root.querySelectorAll(`[${EDITABLE_FIELD_ATTR}]`)
  ) as HTMLElement[];
  const idx = list.indexOf(current);
  if (idx === -1) return false;

  const next = list[idx + direction];
  if (!next) return false;

  next.focus();
  placeCaretAtEnd(next);
  return true;
}
