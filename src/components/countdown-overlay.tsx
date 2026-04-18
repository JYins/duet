"use client";

import { AnimatePresence, motion } from "framer-motion";

export default function CountdownOverlay({ count }: { count: number | null }) {
  return (
    <AnimatePresence>
      {count !== null && (
        <motion.div
          key={count}
          initial={{ opacity: 0, scale: 1.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="text-7xl font-light text-white drop-shadow-lg">
            {count}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
