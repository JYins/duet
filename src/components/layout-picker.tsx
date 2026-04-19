"use client";

import { motion } from "framer-motion";
import type { FrameLayout } from "@/lib/composite";

const ALL_LAYOUTS: { id: FrameLayout; label: string; count: number }[] = [
  { id: "1x4", label: "1×4", count: 4 },
  { id: "2x2", label: "2×2", count: 4 },
  { id: "1x3", label: "1×3", count: 3 },
  { id: "2x3", label: "2×3", count: 6 },
  { id: "2x4", label: "2×4", count: 8 },
  { id: "3x3", label: "3×3", count: 9 },
];

interface LayoutPickerProps {
  value: FrameLayout;
  onChange: (layout: FrameLayout) => void;
  options?: FrameLayout[]; // subset to show, default all
}

export default function LayoutPicker({ value, onChange, options }: LayoutPickerProps) {
  const layouts = options
    ? ALL_LAYOUTS.filter((l) => options.includes(l.id))
    : ALL_LAYOUTS;

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      {layouts.map(({ id, label, count }) => {
        const active = id === value;
        return (
          <motion.button
            key={id}
            onClick={() => onChange(id)}
            whileTap={{ scale: 0.95 }}
            className={`flex flex-col items-center rounded-lg px-3 py-1.5 text-[11px] tracking-wide transition-all duration-300 ${
              active
                ? "bg-[#2C2C2A] text-[#F5F2EA]"
                : "border border-[#DDD9D0] text-[#8A8780] hover:border-[#D4A574] hover:text-[#2C2C2A]"
            }`}
          >
            <span className="font-medium">{label}</span>
            <span className={`text-[9px] ${active ? "text-[#F5F2EA]/60" : "text-[#B5B2AB]"}`}>
              {count}p
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
