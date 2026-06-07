"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { CaptureShot } from "@/types/capture";

interface PhotoStripPreviewProps {
  shots: CaptureShot[];
  selectedIndices?: number[];
  onToggle?: (index: number) => void;
  onReorder?: (from: number, to: number) => void;
  neededCount?: number;
  slotStart?: number;
  showOrderTray?: boolean;
}

export default function PhotoStripPreview({
  shots,
  selectedIndices = [],
  onToggle,
  onReorder,
  neededCount,
  slotStart = 0,
  showOrderTray = true,
}: PhotoStripPreviewProps) {
  const interactive = Boolean(onToggle);
  const uniqueSelected = selectedIndices.filter((idx, i) => selectedIndices.indexOf(idx) === i);
  const selectedShots = uniqueSelected
    .map((idx) => shots.find((shot) => shot.index === idx))
    .filter((shot): shot is CaptureShot => Boolean(shot));

  return (
    <div className="flex w-full max-w-[23rem] flex-col items-center gap-3">
      <div className="strip-grid" aria-label="Captured photos">
        {shots.map((shot) => {
          const selectedOrder = uniqueSelected.indexOf(shot.index);
          const active = interactive ? selectedOrder !== -1 : selectedOrder !== -1 || shot.selected;
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

      {showOrderTray && onReorder && selectedShots.length > 0 && (
        <div className="strip-order-tray" aria-label="Selected frame order">
          {selectedShots.map((shot, order) => (
            <div key={`${shot.index}-${order}`} className="strip-order-item">
              <button
                type="button"
                aria-label={`Move frame ${order + 1} earlier`}
                disabled={order === 0}
                onClick={() => onReorder(order, order - 1)}
                className="strip-order-move"
              >
                <ArrowLeft size={12} strokeWidth={1.5} />
              </button>
              <div className="strip-order-thumb">
                <Image src={shot.filteredUrl} alt={`Selected ${order + 1}`} fill className="object-cover" unoptimized />
                <span className="strip-order-slot">{slotStart + order + 1}</span>
              </div>
              <button
                type="button"
                aria-label={`Move frame ${order + 1} later`}
                disabled={order === selectedShots.length - 1}
                onClick={() => onReorder(order, order + 1)}
                className="strip-order-move"
              >
                <ArrowRight size={12} strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
