"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getLayout, type FrameLayout } from "@/lib/composite";
import type { CaptureShot } from "@/types/capture";

interface PhotoStripPreviewProps {
  shots: CaptureShot[];
  selectedIndices?: number[];
  onToggle?: (index: number) => void;
  onReorder?: (from: number, to: number) => void;
  onSwap?: (a: number, b: number) => void;
  neededCount?: number;
  slotStart?: number;
  showOrderTray?: boolean;
  layout?: FrameLayout;
}

export default function PhotoStripPreview({
  shots,
  selectedIndices = [],
  onToggle,
  onReorder,
  onSwap,
  neededCount,
  slotStart = 0,
  showOrderTray = true,
  layout,
}: PhotoStripPreviewProps) {
  const [armedSlot, setArmedSlot] = useState<number | null>(null);
  const interactive = Boolean(onToggle);
  const uniqueSelected = selectedIndices.filter((idx, i) => selectedIndices.indexOf(idx) === i);
  const layoutCfg = layout ? getLayout(layout) : null;
  const selectedShots = uniqueSelected
    .map((idx) => shots.find((shot) => shot.index === idx))
    .filter((shot): shot is CaptureShot => Boolean(shot));

  const handleSlotTap = (order: number) => {
    if (!onSwap) return;
    if (armedSlot === null) {
      setArmedSlot(order);
      return;
    }
    if (armedSlot !== order) onSwap(armedSlot, order);
    setArmedSlot(null);
  };

  return (
    <div className="flex w-full max-w-[23rem] flex-col items-center gap-3">
      <div className="strip-grid" aria-label="Captured photos">
        {shots.map((shot) => {
          const selectedOrder = uniqueSelected.indexOf(shot.index);
          const active = selectedOrder !== -1 || (!interactive && uniqueSelected.length === 0 && shot.selected);
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

      {layoutCfg && (
        <div
          className="strip-position-map"
          aria-label="Paper positions"
          style={{ gridTemplateColumns: `repeat(${layoutCfg.cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: layoutCfg.count }).map((_, order) => {
            const shot = selectedShots[order];
            return (
              <button
                key={`slot-${order}`}
                type="button"
                disabled={!shot || !onSwap}
                onClick={() => handleSlotTap(order)}
                className={`strip-position-slot ${shot ? "" : "strip-position-slot-empty"} ${
                  armedSlot === order ? "strip-position-slot-active" : ""
                }`}
                aria-label={`Frame position ${slotStart + order + 1}`}
              >
                <span className="strip-position-number">{slotStart + order + 1}</span>
                {shot && (
                  <Image src={shot.filteredUrl} alt={`Frame ${order + 1}`} fill className="object-cover" unoptimized />
                )}
              </button>
            );
          })}
        </div>
      )}

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
