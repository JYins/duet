"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Check, RotateCcw } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";

interface SegmentationPreviewProps {
  originals: string[];
  cutouts: string[];
  onConfirm: () => void;
  onRetake: () => void;
}

export default function SegmentationPreview({
  originals,
  cutouts,
  onConfirm,
  onRetake,
}: SegmentationPreviewProps) {
  const { t } = useLocale();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-5"
    >
      <p className="text-xs tracking-wide text-[#8A8780]">
        {t("ghost.previewTitle")}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cutouts.map((cutout, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            {/* original (small) */}
            <div className="relative h-16 w-12 overflow-hidden rounded-sm border border-[#DDD9D0] sm:h-20 sm:w-15">
              <Image src={originals[i]} alt={`original ${i}`} fill className="object-cover" unoptimized />
            </div>
            {/* cutout (larger, checkered bg to show transparency) */}
            <div
              className="relative h-24 w-18 overflow-hidden rounded-md border border-[#DDD9D0] sm:h-28 sm:w-21"
              style={{
                backgroundImage: "linear-gradient(45deg, #eee 25%, transparent 25%), linear-gradient(-45deg, #eee 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #eee 75%), linear-gradient(-45deg, transparent 75%, #eee 75%)",
                backgroundSize: "8px 8px",
                backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
              }}
            >
              <Image src={cutout} alt={`cutout ${i}`} fill className="object-contain" unoptimized />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onRetake}
          className="flex items-center gap-1.5 rounded-full border border-[#DDD9D0] px-4 py-2 text-[11px] text-[#8A8780] hover:border-[#D4A574]"
        >
          <RotateCcw size={12} />
          {t("ghost.retakeThis")}
        </button>
        <button
          onClick={onConfirm}
          className="flex items-center gap-1.5 rounded-full bg-[#2C2C2A] px-5 py-2 text-[11px] text-[#F5F2EA]"
        >
          <Check size={12} />
          {t("ghost.looksGood")}
        </button>
      </div>
    </motion.div>
  );
}
