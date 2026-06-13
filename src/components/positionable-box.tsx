"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { GripHorizontal } from "lucide-react";
import { boxToCssPct, type Box } from "@/lib/layout";
import {
  applyBoxTransform,
  pointerDeltaToInches,
  resolveElementBox,
  setElementBox,
  type ResizeHandle,
} from "@/lib/element-boxes";
import type { Slide } from "@/lib/types";

interface SlideLayoutContextValue {
  enabled: boolean;
  slide: Slide;
  previewWidth: number;
  updateBox: (elementId: string, box: Box) => void;
}

const SlideLayoutContext = createContext<SlideLayoutContextValue | null>(null);

export function SlideLayoutProvider({
  enabled,
  slide,
  previewWidth,
  onSlideChange,
  children,
}: {
  enabled: boolean;
  slide: Slide;
  previewWidth: number;
  onSlideChange?: (slide: Slide) => void;
  children: React.ReactNode;
}) {
  const updateBox = useCallback(
    (elementId: string, box: Box) => {
      if (!onSlideChange) return;
      onSlideChange(setElementBox(slide, elementId, box));
    },
    [onSlideChange, slide]
  );

  return (
    <SlideLayoutContext.Provider
      value={{
        enabled: enabled && !!onSlideChange,
        slide,
        previewWidth,
        updateBox,
      }}
    >
      {children}
    </SlideLayoutContext.Provider>
  );
}

const HANDLE_SIZE = 8;

const handleStyle = (corner: ResizeHandle): React.CSSProperties => {
  const base: React.CSSProperties = {
    position: "absolute",
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    background: "#2563eb",
    border: "1px solid white",
    borderRadius: 2,
    zIndex: 20,
    touchAction: "none",
  };
  switch (corner) {
    case "nw":
      return { ...base, left: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2, cursor: "nwse-resize" };
    case "ne":
      return { ...base, right: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2, cursor: "nesw-resize" };
    case "sw":
      return { ...base, left: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2, cursor: "nesw-resize" };
    case "se":
      return { ...base, right: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2, cursor: "nwse-resize" };
  }
};

/** Absolutely positioned region; drag the top bar or corner handles to move/resize in preview. */
export function PositionableBox({
  elementId,
  defaultBox,
  children,
  style,
  zIndex = 1,
}: {
  elementId: string;
  defaultBox: Box;
  children: React.ReactNode;
  style?: React.CSSProperties;
  zIndex?: number;
}) {
  const ctx = useContext(SlideLayoutContext);
  const box = resolveElementBox(elementId, defaultBox, ctx?.slide.element_boxes);
  const [active, setActive] = useState(false);
  const [hovered, setHovered] = useState(false);
  const dragRef = useRef<{
    handle: "move" | ResizeHandle;
    startClient: { x: number; y: number };
    startBox: Box;
  } | null>(null);
  const liveBoxRef = useRef<Box>(box);
  const [, forceRender] = useState(0);

  const editable = ctx?.enabled ?? false;
  const displayBox = dragRef.current ? liveBoxRef.current : box;
  const displayCss = boxToCssPct(displayBox);

  const beginDrag = (
    e: React.PointerEvent,
    handle: "move" | ResizeHandle
  ) => {
    if (!editable || !ctx) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      handle,
      startClient: { x: e.clientX, y: e.clientY },
      startBox: { ...box },
    };
    liveBoxRef.current = { ...box };
    setActive(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || !ctx) return;
    const { dx, dy } = pointerDeltaToInches(
      e.clientX - drag.startClient.x,
      e.clientY - drag.startClient.y,
      ctx.previewWidth
    );
    liveBoxRef.current = applyBoxTransform(drag.startBox, drag.handle, dx, dy);
    forceRender((n) => n + 1);
  };

  const endDrag = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || !ctx) return;
    dragRef.current = null;
    setActive(false);
    ctx.updateBox(elementId, liveBoxRef.current);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  const showChrome = editable && (hovered || active);

  return (
    <div
      style={{
        position: "absolute",
        left: displayCss.left,
        top: displayCss.top,
        width: displayCss.width,
        height: displayCss.height,
        zIndex,
        ...style,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => !active && setHovered(false)}
    >
      {showChrome && (
        <>
          <div
            role="button"
            aria-label="Move element"
            tabIndex={-1}
            onPointerDown={(e) => beginDrag(e, "move")}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 14,
              cursor: "grab",
              background: "rgba(37, 99, 235, 0.15)",
              borderBottom: "1px solid rgba(37, 99, 235, 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 15,
              touchAction: "none",
            }}
          >
            <GripHorizontal
              className="text-blue-600"
              style={{ width: 14, height: 14, pointerEvents: "none" }}
            />
          </div>
          {(["nw", "ne", "sw", "se"] as ResizeHandle[]).map((corner) => (
            <div
              key={corner}
              role="button"
              aria-label={`Resize ${corner}`}
              tabIndex={-1}
              style={handleStyle(corner)}
              onPointerDown={(e) => beginDrag(e, corner)}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            />
          ))}
          <div
            style={{
              position: "absolute",
              inset: 0,
              border: "1px dashed rgba(37, 99, 235, 0.55)",
              pointerEvents: "none",
              borderRadius: 2,
            }}
          />
        </>
      )}
      <div
        style={{
          width: "100%",
          height: "100%",
          overflow: "hidden",
          paddingTop: showChrome ? 14 : 0,
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    </div>
  );
}
