"use client";

import { AnimatePresence, motion } from "framer-motion";

export default function CountdownOverlay({ count }: { count: number | null }) {
  return (
    <AnimatePresence>
      {count !== null && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 flex items-center justify-center rounded-lg bg-[#2C2C2A]/20 backdrop-blur-[2px]"
        >
          <AnimatePresence mode="popLayout">
            <motion.div
              key={count}
              initial={{ opacity: 0, scale: 0.5, filter: "blur(8px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.8, filter: "blur(4px)" }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              {/* glow ring */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-16 w-16 rounded-full border border-white/20"
                />
              </div>
              <span className="relative font-serif text-7xl font-light italic text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.3)] sm:text-8xl">
                {count}
              </span>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
