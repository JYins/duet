"use client";

import { motion } from "framer-motion";
import type { FrameLayout } from "@/lib/composite";

const LAYOUTS: { id: FrameLayout; icon: string; label: string }[] = [
  { id: "1x4", icon: "▮▮▮▮", label: "1×4" },
  { id: "2x2", icon: "▦", label: "2×2" },
  { id: "1x3", icon: "▮▮▮", label: "1×3" },
  { id: "2x3", icon: "⬡", label: "2×3" },
];

interface LayoutPickerProps {
  value: FrameLayout;
  onChange: (layout: FrameLayout) => void;
}

export default function LayoutPicker({ value, onChange }: LayoutPickerProps) {
  return (
    <div className="flex items-center gap-1.5">
      {LAYOUTS.map(({ id, label }) => {
        const active = id === value;
        return (
          <motion.button
            key={id}
            onClick={() => onChange(id)}
            whileTap={{ scale: 0.95 }}
            className={`rounded-full px-3 py-1.5 text-[11px] tracking-wide transition-all duration-300 ${
              active
                ? "bg-[#2C2C2A] text-[#F5F2EA]"
                : "border border-[#DDD9D0] text-[#8A8780] hover:border-[#D4A574] hover:text-[#2C2C2A]"
            }`}
          >
            {label}
          </motion.button>
        );
      })}
    </div>
  );
}
