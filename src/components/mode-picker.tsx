"use client";

import { motion } from "framer-motion";
import { Users, Ghost } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import type { RoomMode } from "@/types/room";

interface ModePickerProps {
  onSelect: (mode: RoomMode) => void;
}

export default function ModePicker({ onSelect }: ModePickerProps) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-5">
      {([
        {
          mode: "async" as RoomMode,
          icon: Users,
          title: t("mode.async"),
          desc: t("mode.asyncDesc"),
        },
        {
          mode: "ghost" as RoomMode,
          icon: Ghost,
          title: t("mode.ghost"),
          desc: t("mode.ghostDesc"),
        },
      ]).map(({ mode, icon: Icon, title, desc }) => (
        <motion.button
          key={mode}
          onClick={() => onSelect(mode)}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          className="flex w-full max-w-[200px] flex-col items-center gap-3 rounded-2xl border border-[#2C2C2A]/[0.06] bg-[#FDFCF9] px-6 py-7 text-center shadow-sm transition-all duration-300 hover:border-[#D4A574]/30 hover:shadow-md sm:py-8"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F2EA]">
            <Icon size={22} strokeWidth={1.5} className="text-[#2C2C2A]" />
          </div>
          <span className="text-sm font-medium tracking-wide text-[#2C2C2A]">
            {title}
          </span>
          <span className="text-[10px] leading-relaxed text-[#8A8780] sm:text-[11px]">
            {desc}
          </span>
        </motion.button>
      ))}
    </div>
  );
}
