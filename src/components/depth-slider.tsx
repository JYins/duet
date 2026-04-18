"use client";

import { motion } from "framer-motion";

interface DepthSliderProps {
  value: number;
  onChange: (v: number) => void;
}

export default function DepthSlider({ value, onChange }: DepthSliderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3"
    >
      <span className="text-[10px] tracking-wide text-[#8A8780] uppercase sm:text-xs">
        depth
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 w-32 cursor-pointer appearance-none rounded-full bg-[#DDD9D0] accent-[#2C2C2A] sm:w-40
          [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-[#2C2C2A]
          [&::-webkit-slider-thumb]:shadow-sm"
      />
      <span className="w-6 text-right font-mono text-[10px] text-[#8A8780]">
        {value}
      </span>
    </motion.div>
  );
}
