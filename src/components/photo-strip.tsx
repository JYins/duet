"use client";

import { motion } from "framer-motion";
import Image from "next/image";

// displays captured photos in a 1x4 strip layout
export default function PhotoStrip({
  photos,
  label,
}: {
  photos: string[];
  label?: string;
}) {
  if (photos.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 rounded-lg bg-white p-2 shadow-sm">
      {label && (
        <span className="mb-1 text-center text-xs text-[#8A8780]">
          {label}
        </span>
      )}
      {photos.map((src, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1, duration: 0.4, ease: "easeOut" }}
          className="relative aspect-[3/4] w-40 overflow-hidden rounded-sm bg-[#F5F2EA]"
        >
          <Image
            src={src}
            alt={`photo ${i + 1}`}
            fill
            className="object-cover"
            unoptimized
          />
        </motion.div>
      ))}
    </div>
  );
}
