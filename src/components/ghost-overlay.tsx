"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

// semi-transparent overlay of partner's cutout(s) on the viewfinder
// cycles to match current shot number
interface GhostOverlayProps {
  cutouts: string[];
  currentShot?: number;
}

export default function GhostOverlay({ cutouts, currentShot = 0 }: GhostOverlayProps) {
  const idx = Math.min(currentShot, cutouts.length - 1);
  const src = cutouts[idx];
  if (!src) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={idx}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden rounded-lg"
      >
        <Image
          src={src}
          alt="partner pose guide"
          fill
          className="object-contain"
          unoptimized
        />
      </motion.div>
    </AnimatePresence>
  );
}
