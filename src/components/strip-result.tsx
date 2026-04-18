"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Download, RotateCcw } from "lucide-react";
import { downloadImage } from "@/lib/composite";

interface StripResultProps {
  stripUrl: string;
  onRetake: () => void;
}

export default function StripResult({ stripUrl, onRetake }: StripResultProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex flex-col items-center gap-6 sm:gap-8"
    >
      {/* the strip — physical print feel */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        className="relative"
      >
        <div className="absolute -inset-2 rounded-xl bg-[#2C2C2A]/[0.03] blur-xl" />

        <div className="relative overflow-hidden rounded-lg border border-[#2C2C2A]/[0.06]">
          <Image
            src={stripUrl}
            alt="your duet strip"
            width={300}
            height={0}
            className="h-auto w-[240px] sm:w-[280px] md:w-[300px]"
            unoptimized
            priority
          />
        </div>
      </motion.div>

      {/* actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="flex items-center gap-2.5 sm:gap-3"
      >
        <button
          onClick={onRetake}
          className="flex items-center gap-1.5 rounded-full border border-[#DDD9D0] px-4 py-2 text-xs text-[#2C2C2A] transition-all duration-300 hover:border-[#D4A574] hover:bg-[#FDFCF9] sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm"
        >
          <RotateCcw size={13} />
          retake
        </button>
        <button
          onClick={() => downloadImage(stripUrl)}
          className="flex items-center gap-1.5 rounded-full bg-[#2C2C2A] px-4 py-2 text-xs text-[#F5F2EA] transition-all duration-300 hover:bg-[#3d3d3a] sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm"
        >
          <Download size={13} />
          save
        </button>
      </motion.div>
    </motion.div>
  );
}
