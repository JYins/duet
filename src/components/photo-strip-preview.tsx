"use client";

import Image from "next/image";
import type { CaptureShot } from "@/types/capture";

interface PhotoStripPreviewProps {
  shots: CaptureShot[];
  selectedIndices?: number[];
  onToggle?: (index: number) => void;
  neededCount?: number;
}

export default function PhotoStripPreview({
  shots,
  selectedIndices = [],
  onToggle,
  neededCount,
}: PhotoStripPreviewProps) {
  return (
    <div className="strip-grid" aria-label="Captured photos">
      {shots.map((shot) => {
        const selectedOrder = selectedIndices.indexOf(shot.index);
        const active = selectedOrder !== -1 || shot.selected;
        return (
          <button
            key={shot.index}
            type="button"
            onClick={() => onToggle?.(shot.index)}
            disabled={!onToggle}
            className={`strip-thumb ${active ? "strip-thumb-active" : ""}`}
          >
            <Image
              src={shot.filteredUrl}
              alt={`Shot ${shot.index + 1}`}
              fill
              className="object-cover"
              unoptimized
            />
            {active && (
              <span className="strip-badge">
                {selectedOrder === -1 ? shot.index + 1 : selectedOrder + 1}
              </span>
            )}
          </button>
        );
      })}
      {neededCount &&
        Array.from({ length: Math.max(0, neededCount - shots.length) }).map((_, i) => (
          <div key={`empty-${i}`} className="strip-empty" />
        ))}
    </div>
  );
}
