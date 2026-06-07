"use client";

import { PAPER_STYLES, type PaperStyleId } from "@/lib/paper-styles";

interface PaperPickerProps {
  value: PaperStyleId;
  onChange: (value: PaperStyleId) => void;
}

export default function PaperPicker({ value, onChange }: PaperPickerProps) {
  return (
    <div className="paper-picker" aria-label="Paper style">
      {PAPER_STYLES.map((style) => (
        <button
          key={style.id}
          type="button"
          onClick={() => onChange(style.id)}
          aria-pressed={value === style.id}
          title={style.label}
          className={`paper-swatch ${value === style.id ? "paper-swatch-active" : ""}`}
        >
          <span
            className={`paper-swatch-chip paper-pattern-${style.pattern}`}
            style={{
              backgroundColor: style.color,
              borderColor: style.accent,
              color: style.accent,
            }}
          />
          <span>{style.label}</span>
        </button>
      ))}
    </div>
  );
}
