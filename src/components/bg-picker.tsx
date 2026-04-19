"use client";

import { motion } from "framer-motion";
import { BACKGROUNDS, type Background } from "@/lib/backgrounds";

interface BgPickerProps {
  value: string;
  onChange: (bg: Background) => void;
}

export default function BgPicker({ value, onChange }: BgPickerProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
      {BACKGROUNDS.map((bg) => {
        const active = bg.id === value;
        return (
          <motion.button
            key={bg.id}
            onClick={() => onChange(bg)}
            whileTap={{ scale: 0.9 }}
            className={`relative h-8 w-8 overflow-hidden rounded-full border-2 transition-all duration-300 sm:h-9 sm:w-9 ${
              active
                ? "border-[#2C2C2A] shadow-sm"
                : "border-[#2C2C2A]/[0.06] hover:border-[#D4A574]/40"
            }`}
            aria-label={bg.label}
            title={bg.label}
          >
            {bg.url ? (
              <img
                src={bg.url}
                alt={bg.label}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="h-full w-full" style={{ backgroundColor: bg.color }} />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
