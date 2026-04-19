"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Check, ArrowLeftRight } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";

interface PhotoSelectorProps {
  photos: string[]; // all captured frames
  maxSelect: number;
  onConfirm: (selected: string[]) => void;
}

export default function PhotoSelector({
  photos,
  maxSelect,
  onConfirm,
}: PhotoSelectorProps) {
  const { t } = useLocale();
  // indices of selected photos in selection order
  const [selected, setSelected] = useState<number[]>([]);

  const toggle = useCallback(
    (idx: number) => {
      setSelected((prev) => {
        if (prev.includes(idx)) {
          return prev.filter((i) => i !== idx);
        }
        if (prev.length >= maxSelect) return prev;
        return [...prev, idx];
      });
    },
    [maxSelect],
  );

  const swap = useCallback((a: number, b: number) => {
    setSelected((prev) => {
      const next = [...prev];
      [next[a], next[b]] = [next[b], next[a]];
      return next;
    });
  }, []);

  const confirm = useCallback(() => {
    if (selected.length !== maxSelect) return;
    onConfirm(selected.map((i) => photos[i]));
  }, [selected, maxSelect, photos, onConfirm]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-5"
    >
      <p className="text-xs tracking-wide text-[#8A8780] sm:text-sm">
        {t("booth.selectPhotos")} ({selected.length}/{maxSelect})
      </p>

      {/* thumbnail grid */}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 sm:gap-2.5">
        {photos.map((src, i) => {
          const selIdx = selected.indexOf(i);
          const isSelected = selIdx !== -1;
          return (
            <motion.button
              key={i}
              onClick={() => toggle(i)}
              whileTap={{ scale: 0.95 }}
              className={`relative aspect-[3/4] w-16 overflow-hidden rounded-md border-2 transition-all duration-300 sm:w-20 ${
                isSelected
                  ? "border-[#2C2C2A] shadow-sm"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <Image
                src={src}
                alt={`shot ${i + 1}`}
                fill
                className="object-cover"
                unoptimized
              />
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#2C2C2A] text-[9px] font-medium text-[#F5F2EA]"
                  >
                    {selIdx + 1}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {/* selected order — reorderable */}
      {selected.length > 1 && (
        <div className="flex items-center gap-1.5">
          {selected.map((photoIdx, orderIdx) => (
            <div key={orderIdx} className="flex items-center gap-1">
              <div className="relative h-12 w-9 overflow-hidden rounded-sm border border-[#2C2C2A]/10 sm:h-14 sm:w-11">
                <Image
                  src={photos[photoIdx]}
                  alt={`pick ${orderIdx + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <span className="absolute bottom-0 left-0 right-0 bg-[#2C2C2A]/60 text-center text-[8px] text-white">
                  {orderIdx + 1}
                </span>
              </div>
              {orderIdx < selected.length - 1 && (
                <button
                  onClick={() => swap(orderIdx, orderIdx + 1)}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[#8A8780] hover:bg-[#EDE9DF] hover:text-[#2C2C2A]"
                  aria-label="swap"
                >
                  <ArrowLeftRight size={10} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* confirm */}
      <button
        onClick={confirm}
        disabled={selected.length !== maxSelect}
        className="flex items-center gap-1.5 rounded-full bg-[#2C2C2A] px-6 py-2.5 text-xs tracking-wide text-[#F5F2EA] transition-all duration-300 hover:bg-[#3d3d3a] disabled:opacity-30"
      >
        <Check size={14} strokeWidth={1.5} />
        {t("booth.confirmSelection")}
      </button>
    </motion.div>
  );
}
