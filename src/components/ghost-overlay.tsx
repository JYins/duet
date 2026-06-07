"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useLocale } from "@/hooks/use-locale";

// semi-transparent overlay of partner's cutout(s) on the viewfinder
// cycles to match current shot number
interface GhostOverlayProps {
  cutouts: string[];
  currentShot?: number;
}

export default function GhostOverlay({ cutouts, currentShot = 0 }: GhostOverlayProps) {
  const { t } = useLocale();
  const idx = Math.min(currentShot, cutouts.length - 1);
  const src = cutouts[idx];
  if (!src) return null;
  const isFallback = src.includes("#fallback");

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={idx}
        initial={{ opacity: 0 }}
        animate={{ opacity: isFallback ? 1 : 0.3 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden rounded-lg"
      >
        {isFallback ? (
          <div className="absolute right-3 top-3 w-24 overflow-hidden rounded-xl border border-white/55 bg-[#FDFCF9]/80 p-1 shadow-lg backdrop-blur-sm">
            <div className="relative aspect-[3/4] overflow-hidden rounded-lg">
              <Image src={src} alt={t("ghost.partnerReference")} fill className="object-cover" unoptimized />
            </div>
          </div>
        ) : (
          <Image
            src={src}
            alt={t("ghost.partnerGuide")}
            fill
            className="object-cover drop-shadow-[0_8px_18px_rgba(255,255,255,0.24)]"
            unoptimized
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
