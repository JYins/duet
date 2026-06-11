"use client";

import { motion } from "framer-motion";
import { ArrowRight, Users, Ghost } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import type { RoomMode } from "@/types/room";

interface ModePickerProps {
  onSelect: (mode: RoomMode) => void;
}

export default function ModePicker({ onSelect }: ModePickerProps) {
  const { t } = useLocale();

  return (
    <div className="mx-auto flex w-full max-w-[340px] flex-col gap-3 sm:max-w-[680px] sm:flex-row sm:gap-4">
      {([
        {
          mode: "async" as RoomMode,
          icon: Users,
          title: t("mode.async"),
          desc: t("mode.asyncDesc"),
          tone: "bg-[#FFF8EA] text-[#B9862E]",
          border: "hover:border-[#E5BE72]/60",
        },
        {
          mode: "ghost" as RoomMode,
          icon: Ghost,
          title: t("mode.ghost"),
          desc: t("mode.ghostDesc"),
          tone: "bg-[#EEF7F2] text-[#4D8D6B]",
          border: "hover:border-[#9FCDB7]/70",
        },
      ]).map(({ mode, icon: Icon, title, desc, tone, border }) => (
        <motion.button
          key={mode}
          type="button"
          onClick={() => onSelect(mode)}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.985 }}
          className={`group grid min-h-[148px] w-full grid-cols-[48px_1fr_28px] items-center gap-4 rounded-[10px] border border-[#2C2C2A]/[0.08] bg-[#FDFCF9] px-5 py-5 text-left shadow-[0_14px_34px_rgba(44,44,42,0.06)] transition-all duration-300 ${border} hover:bg-white hover:shadow-[0_18px_44px_rgba(44,44,42,0.09)] sm:min-h-[168px] sm:grid-cols-1 sm:items-start sm:gap-5`}
        >
          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${tone}`}>
            <Icon size={22} strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <span className="block text-[15px] font-medium tracking-wide text-[#2C2C2A]">
              {title}
            </span>
            <span className="mt-2 block text-[11px] leading-[1.7] text-[#8A8780] sm:text-[12px]">
              {desc}
            </span>
          </div>
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#2C2C2A]/10 text-[#2C2C2A]/55 transition-all duration-300 group-hover:border-[#2C2C2A]/20 group-hover:text-[#2C2C2A] sm:self-end">
            <ArrowRight size={14} strokeWidth={1.8} />
          </span>
        </motion.button>
      ))}
    </div>
  );
}
