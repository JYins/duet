"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { getLayout, type FrameLayout } from "@/lib/composite";
import type { LutPreset } from "@/lib/lut";
import { PAPER_STYLES, type PaperStyleId } from "@/lib/paper-styles";
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
  label: string;
  paperStyle: PaperStyleId;
}

interface RoomConfigProps {
  mode: RoomMode;
  onConfirm: (settings: RoomSettings) => void;
}

export default function RoomConfig({ mode, onConfirm }: RoomConfigProps) {
  const { t } = useLocale();
  const [layout, setLayout] = useState<FrameLayout>("2x2");
  const [lut, setLut] = useState<LutPreset>("k-booth");
  const [participants, setParticipants] = useState(2);
  const [bgId, setBgId] = useState("cream");
  const [bgColor, setBgColor] = useState("#EDE9DF");
  const [bgUrl, setBgUrl] = useState<string | undefined>(undefined);
  const [label, setLabel] = useState("");
  const [paperStyle, setPaperStyle] = useState<PaperStyleId>("porcelain");

  const handleBg = (bg: Background) => {
    setBgId(bg.id);
    setBgColor(bg.color);
    setBgUrl(bg.url ?? undefined);
  };

  const participantOptions = [2, 3, 4].filter((count) => count <= getLayout(layout).count);
  const handleLayoutChange = (nextLayout: FrameLayout) => {
    setLayout(nextLayout);
    const maxParticipants = getLayout(nextLayout).count;
    setParticipants((current) => Math.min(current, maxParticipants));
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
            {participantOptions.map((n) => (
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
        <LayoutPicker value={layout} onChange={handleLayoutChange} />
      </div>

      {/* filter */}
      <LutPicker value={lut} onChange={setLut} />

      <div className="flex w-full max-w-[22rem] flex-col items-center gap-2">
        <span className="text-[10px] tracking-wide text-[#8A8780] uppercase">
          {t("config.paper")}
        </span>
        <div className="grid w-full grid-cols-3 gap-2">
          {PAPER_STYLES.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => setPaperStyle(style.id)}
              className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-[11px] transition ${
                paperStyle === style.id
                  ? "border-[#2C2C2A]/30 bg-[#FDFCF9] text-[#2C2C2A]"
                  : "border-[#2C2C2A]/10 text-[#8A8780]"
              }`}
            >
              <span
                className="h-4 w-4 rounded-full border border-[#2C2C2A]/10"
                style={{ backgroundColor: style.color }}
              />
              <span className="truncate">{style.label}</span>
            </button>
          ))}
        </div>
      </div>

      <input
        type="text"
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        placeholder={t("booth.labelPlaceholder")}
        maxLength={28}
        className="w-full max-w-[22rem] rounded-full border border-[#2C2C2A]/10 bg-[#FDFCF9] px-5 py-3 text-center text-[13px] text-[#2C2C2A] placeholder:text-[#B5B2AB] focus:border-[#D4A574]/40 focus:outline-none"
      />

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
          participantCount: mode === "ghost" ? 2 : Math.min(participants, getLayout(layout).count),
          backgroundId: bgId,
          bgColor,
          bgUrl,
          label,
          paperStyle,
        })}
        className="group flex items-center gap-2 rounded-full bg-[#2C2C2A] px-7 py-3 text-[13px] tracking-wide text-[#F5F2EA] transition-all hover:shadow-lg hover:shadow-[#2C2C2A]/10"
      >
        {t("config.createRoom")}
        <ArrowRight size={14} strokeWidth={1.5} className="transition-transform group-hover:translate-x-0.5" />
      </motion.button>
    </motion.div>
  );
}
