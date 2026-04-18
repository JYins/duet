"use client";

import { motion } from "framer-motion";
import { type LutPreset } from "@/lib/lut";
import { useLocale } from "@/hooks/use-locale";
import type { TranslationKey } from "@/lib/i18n";

const PRESETS: { id: LutPreset; labelKey: TranslationKey }[] = [
  { id: "none", labelKey: "lut.natural" },
  { id: "warm-film", labelKey: "lut.portra" },
  { id: "cool-desat", labelKey: "lut.cool" },
  { id: "bw", labelKey: "lut.mono" },
];

interface LutPickerProps {
  value: LutPreset;
  onChange: (preset: LutPreset) => void;
}

export default function LutPicker({ value, onChange }: LutPickerProps) {
  const { t } = useLocale();

  return (
    <div className="flex items-center gap-2">
      {PRESETS.map(({ id, labelKey }) => {
        const active = id === value;
        return (
          <motion.button
            key={id}
            onClick={() => onChange(id)}
            whileTap={{ scale: 0.95 }}
            className={`rounded-full px-3.5 py-1.5 text-xs tracking-wide transition-all duration-300 ${
              active
                ? "bg-[#2C2C2A] text-[#F5F2EA]"
                : "border border-[#DDD9D0] text-[#8A8780] hover:border-[#D4A574] hover:text-[#2C2C2A]"
            }`}
          >
            {t(labelKey)}
          </motion.button>
        );
      })}
    </div>
  );
}
