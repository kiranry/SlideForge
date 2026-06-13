"use client";

import React, { useEffect, useRef } from "react";
import {
  EDITABLE_FIELD_ATTR,
  focusAdjacentEditableField,
} from "@/lib/slide-field-nav";

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  style?: React.CSSProperties;
  editable?: boolean;
  className?: string;
  /** Accessible name for this field (e.g. "Slide title"). */
  fieldLabel?: string;
}

/** Click-to-edit text block aligned to slide layout regions. */
export function EditableText({
  value,
  onChange,
  style,
  editable,
  className,
  fieldLabel,
}: EditableTextProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.textContent !== value && !ref.current.matches(":focus")) {
      ref.current.textContent = value;
    }
  }, [value]);

  if (!editable) {
    return (
      <div style={style} className={className}>
        {value}
      </div>
    );
  }

  const ariaLabel = fieldLabel ?? "Editable text";

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={ariaLabel}
      {...{ [EDITABLE_FIELD_ATTR]: true }}
      tabIndex={0}
      className={className}
      style={{
        ...style,
        outline: "none",
        cursor: "text",
        borderRadius: 2,
      }}
      onBlur={(e) => onChange(e.currentTarget.textContent ?? "")}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow = "0 0 0 2px rgba(59, 130, 246, 0.45)";
      }}
      onBlurCapture={(e) => {
        e.currentTarget.style.boxShadow = "none";
      }}
      onKeyDown={(e) => {
        if (e.key === "Tab") {
          const moved = focusAdjacentEditableField(
            e.currentTarget,
            e.shiftKey ? -1 : 1
          );
          if (moved) e.preventDefault();
        }
      }}
    >
      {value}
    </div>
  );
}

interface EditableBulletsProps {
  items: string[];
  onChange: (items: string[]) => void;
  theme: { body: string };
  px: (pt: number) => number;
  size?: number;
  editable?: boolean;
  fieldLabelPrefix?: string;
}

export function EditableBullets({
  items,
  onChange,
  theme,
  px,
  size = 14,
  editable,
  fieldLabelPrefix = "Bullet",
}: EditableBulletsProps) {
  const fontSize = px(size);

  if (!editable) {
    return (
      <ul style={{ margin: 0, paddingLeft: fontSize, listStyle: "disc" }}>
        {items.map((line, i) => (
          <li
            key={i}
            style={{
              color: theme.body.startsWith("#") ? theme.body : `#${theme.body}`,
              fontSize,
              lineHeight: 1.35,
              marginBottom: fontSize * 0.45,
            }}
          >
            {line}
          </li>
        ))}
      </ul>
    );
  }

  const updateLine = (index: number, text: string) => {
    const next = [...items];
    next[index] = text;
    onChange(next);
  };

  const addLine = () => onChange([...items, ""]);

  return (
    <ul style={{ margin: 0, paddingLeft: fontSize, listStyle: "disc" }}>
      {items.map((line, i) => (
        <li
          key={i}
          style={{
            fontSize,
            lineHeight: 1.35,
            marginBottom: fontSize * 0.45,
            color: theme.body.startsWith("#") ? theme.body : `#${theme.body}`,
          }}
        >
          <EditableText
            editable
            value={line}
            fieldLabel={`${fieldLabelPrefix} ${i + 1}`}
            onChange={(t) => updateLine(i, t)}
            style={{ display: "inline", minWidth: "40px" }}
          />
        </li>
      ))}
      <li style={{ listStyle: "none", marginTop: fontSize * 0.3 }}>
        <button
          type="button"
          onClick={addLine}
          className="text-[10px] text-blue-600 hover:underline"
          style={{ fontSize: fontSize * 0.85 }}
          aria-label="Add bullet"
        >
          + bullet
        </button>
      </li>
    </ul>
  );
}
