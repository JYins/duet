"use client";

import { motion } from "framer-motion";

// small dots showing how many shots taken
export default function ShotCounter({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          initial={false}
          animate={{
            scale: i < current ? 1 : 0.7,
            backgroundColor: i < current ? "#2C2C2A" : "#DDD9D0",
          }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="h-2 w-2 rounded-full"
        />
      ))}
    </div>
  );
}
