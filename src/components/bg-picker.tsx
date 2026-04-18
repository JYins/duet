"use client";

import { motion } from "framer-motion";
import { BACKGROUNDS, type Background } from "@/lib/backgrounds";

interface BgPickerProps {
  value: string;
  onChange: (bg: Background) => void;
}

export default function BgPicker({ value, onChange }: BgPickerProps) {
  return (
    <div className="flex items-center gap-2">
      {BACKGROUNDS.map((bg) => {
        const active = bg.id === value;
        return (
          <motion.button
            key={bg.id}
            onClick={() => onChange(bg)}
            whileTap={{ scale: 0.9 }}
            className={`relative h-9 w-9 overflow-hidden rounded-full border-2 transition-all duration-300 sm:h-10 sm:w-10 ${
              active
                ? "border-[#2C2C2A] shadow-sm"
                : "border-[#DDD9D0] hover:border-[#D4A574]"
            }`}
            aria-label={bg.label}
          >
            {bg.url ? (
              <img
                src={bg.url}
                alt={bg.label}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="h-full w-full bg-[#EDE9DF]" />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
