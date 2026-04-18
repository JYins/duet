"use client";

import { motion } from "framer-motion";
import { LUT_PRESETS, type LutPreset } from "@/lib/lut";

interface LutPickerProps {
  value: LutPreset;
  onChange: (preset: LutPreset) => void;
}

export default function LutPicker({ value, onChange }: LutPickerProps) {
  return (
    <div className="flex items-center gap-2">
      {LUT_PRESETS.map((preset) => {
        const active = preset.id === value;
        return (
          <motion.button
            key={preset.id}
            onClick={() => onChange(preset.id)}
            whileTap={{ scale: 0.95 }}
            className={`rounded-full px-3.5 py-1.5 text-xs tracking-wide transition-all duration-300 ${
              active
                ? "bg-[#2C2C2A] text-[#F5F2EA]"
                : "border border-[#DDD9D0] text-[#8A8780] hover:border-[#D4A574] hover:text-[#2C2C2A]"
            }`}
          >
            {preset.label}
          </motion.button>
        );
      })}
    </div>
  );
}
