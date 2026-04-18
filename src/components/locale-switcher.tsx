"use client";

import { motion } from "framer-motion";
import { useLocale } from "@/hooks/use-locale";
import { LOCALE_LABELS } from "@/lib/i18n";

export default function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-[#2C2C2A]/[0.05] bg-[#FDFCF9]/60 p-0.5 backdrop-blur-sm">
      {LOCALE_LABELS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => setLocale(id)}
          className="relative rounded-full px-2 py-1 text-[10px] tracking-wide transition-colors sm:px-2.5"
        >
          {locale === id && (
            <motion.div
              layoutId="locale-pill"
              className="absolute inset-0 rounded-full bg-[#2C2C2A]"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span
            className={`relative z-10 ${
              locale === id ? "text-[#F5F2EA]" : "text-[#8A8780]"
            }`}
          >
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}
