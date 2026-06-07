"use client";

import { motion } from "framer-motion";
import { type LutPreset } from "@/lib/lut";
import { LUT_PRESETS } from "@/lib/lut";
import { useLocale } from "@/hooks/use-locale";

interface LutPickerProps {
  value: LutPreset;
  onChange: (preset: LutPreset) => void;
}

export default function LutPicker({ value, onChange }: LutPickerProps) {
  const { t } = useLocale();

  return (
    <div className="flex w-full max-w-[24rem] flex-wrap items-center justify-center gap-2 px-1 py-0.5">
      {LUT_PRESETS.map(({ id, label }) => {
        const active = id === value;
        const display = id === "none" ? t("lut.natural") : label;
        return (
          <motion.button
            key={id}
            onClick={() => onChange(id)}
            whileTap={{ scale: 0.95 }}
            className={`min-w-14 rounded-full px-3.5 py-1.5 text-xs tracking-wide transition-all duration-300 ${
              active
                ? "bg-[#2C2C2A] text-[#F5F2EA]"
                : "border border-[#DDD9D0] text-[#8A8780] hover:border-[#D4A574] hover:text-[#2C2C2A]"
            }`}
          >
            {display}
          </motion.button>
        );
      })}
    </div>
  );
}
