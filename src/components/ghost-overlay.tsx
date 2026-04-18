"use client";

import { motion } from "framer-motion";
import Image from "next/image";

// semi-transparent overlay of partner's cutout on the viewfinder
// so the user can align their pose to match
export default function GhostOverlay({ src }: { src: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.3 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
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
  );
}
