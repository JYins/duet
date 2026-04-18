"use client";

import { motion, AnimatePresence } from "framer-motion";

// brief white flash on capture — mimics real camera shutter
export default function ShutterFlash({ flash }: { flash: boolean }) {
  return (
    <AnimatePresence>
      {flash && (
        <motion.div
          key="flash"
          initial={{ opacity: 0.9 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="pointer-events-none absolute inset-0 rounded-lg bg-white"
        />
      )}
    </AnimatePresence>
  );
}
