"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import type { FrameLayout } from "@/lib/composite";
import type { LutPreset } from "@/lib/lut";
import type { RoomMode } from "@/types/room";
import LayoutPicker from "./layout-picker";
import LutPicker from "./lut-picker";
import BgPicker from "./bg-picker";
import type { Background } from "@/lib/backgrounds";

export interface RoomSettings {
  layout: FrameLayout;
  lut: LutPreset;
  participantCount: number;
  backgroundId: string;
  bgColor: string;
  bgUrl?: string;
}

interface RoomConfigProps {
  mode: RoomMode;
  onConfirm: (settings: RoomSettings) => void;
}

export default function RoomConfig({ mode, onConfirm }: RoomConfigProps) {
  const { t } = useLocale();
  const [layout, setLayout] = useState<FrameLayout>("2x2");
  const [lut, setLut] = useState<LutPreset>("warm-film");
  const [participants, setParticipants] = useState(2);
  const [bgId, setBgId] = useState("cream");
  const [bgColor, setBgColor] = useState("#EDE9DF");
  const [bgUrl, setBgUrl] = useState<string | undefined>(undefined);

  const handleBg = (bg: Background) => {
    setBgId(bg.id);
    setBgColor(bg.color);
    setBgUrl(bg.url ?? undefined);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-5"
    >
      <h2 className="font-serif text-lg italic text-[#2C2C2A]/60">
        {mode === "async" ? t("mode.async") : t("mode.ghost")}
      </h2>

      {/* participant count (async only) */}
      {mode === "async" && (
        <div className="flex items-center gap-3">
          <span className="text-[10px] tracking-wide text-[#8A8780] uppercase">
            {t("config.participants")}
          </span>
          <div className="flex items-center gap-1">
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setParticipants(n)}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs transition-all ${
                  participants === n
                    ? "bg-[#2C2C2A] text-[#F5F2EA]"
                    : "border border-[#DDD9D0] text-[#8A8780] hover:border-[#D4A574]"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* layout */}
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-[10px] tracking-wide text-[#8A8780] uppercase">
          {t("config.layout")}
        </span>
        <LayoutPicker value={layout} onChange={setLayout} />
      </div>

      {/* filter */}
      <LutPicker value={lut} onChange={setLut} />

      {/* background (ghost mode needs it upfront) */}
      {mode === "ghost" && (
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[10px] tracking-wide text-[#8A8780] uppercase">
            {t("config.background")}
          </span>
          <BgPicker value={bgId} onChange={handleBg} />
        </div>
      )}

      {/* confirm */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => onConfirm({
          layout,
          lut,
          participantCount: mode === "ghost" ? 2 : participants,
          backgroundId: bgId,
          bgColor,
          bgUrl,
        })}
        className="group flex items-center gap-2 rounded-full bg-[#2C2C2A] px-7 py-3 text-[13px] tracking-wide text-[#F5F2EA] transition-all hover:shadow-lg hover:shadow-[#2C2C2A]/10"
      >
        {t("config.createRoom")}
        <ArrowRight size={14} strokeWidth={1.5} className="transition-transform group-hover:translate-x-0.5" />
      </motion.button>
    </motion.div>
  );
}
