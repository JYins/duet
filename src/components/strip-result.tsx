"use client";

import { motion } from "framer-motion";
import { Download, RotateCcw, Share2 } from "lucide-react";
import { downloadImage } from "@/lib/composite";
import { useLocale } from "@/hooks/use-locale";
import { useCallback, useState } from "react";

interface StripResultProps {
  stripUrl: string;
  onRetake?: () => void;
}

export default function StripResult({ stripUrl, onRetake }: StripResultProps) {
  const { t } = useLocale();
  const [shared, setShared] = useState(false);
  const [sharing, setSharing] = useState(false);

  const share = useCallback(async () => {
    if (sharing) return;
    setSharing(true);
    if (!navigator.share) {
      await downloadImage(stripUrl);
      setSharing(false);
      return;
    }
    try {
      const res = await fetch(stripUrl);
      const blob = await res.blob();
      const fileType = blob.type || "image/png";
      const extension = fileType === "image/jpeg" ? "jpg" : "png";
      const file = new File([blob], `duet-strip.${extension}`, { type: fileType });
      if (navigator.canShare?.({ files: [file] }) === false) {
        await navigator.share({ title: "Duet", text: t("result.shareText"), url: stripUrl });
      } else {
        await navigator.share({ files: [file], title: "Duet", text: t("result.shareText") });
      }
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      await downloadImage(stripUrl);
    } finally {
      setSharing(false);
    }
  }, [sharing, stripUrl, t]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="flex flex-col items-center gap-7 sm:gap-8"
    >
      <motion.div
        initial={{ y: 50, opacity: 0, rotateX: 8 }}
        animate={{ y: 0, opacity: 1, rotateX: 0 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        className="relative"
        style={{ perspective: "800px" }}
      >
        <div className="absolute -inset-3 rounded-2xl bg-[#2C2C2A]/[0.02] blur-xl" />
        <div className="absolute -inset-1.5 rounded-xl bg-[#2C2C2A]/[0.03] blur-md" />
        <div className="relative overflow-hidden rounded-lg border border-[#2C2C2A]/[0.05] shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element -- stripUrl can be a Canvas data URL with a dynamic aspect ratio. */}
          <img
            src={stripUrl}
            alt={t("result.alt")}
            className="block h-auto w-[220px] sm:w-[260px] md:w-[280px]"
          />
          <motion.div
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: "200%", opacity: 1 }}
            transition={{ duration: 1.5, delay: 0.8, ease: "easeInOut" }}
            className="pointer-events-none absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        className="flex items-center gap-2"
      >
        {onRetake && (
          <button
            onClick={onRetake}
            className="flex items-center gap-1.5 rounded-full border border-[#2C2C2A]/[0.08] px-4 py-2 text-[11px] tracking-wide text-[#8A8780] transition-all duration-400 hover:border-[#D4A574]/30 hover:text-[#2C2C2A] sm:px-5 sm:py-2.5 sm:text-xs"
          >
            <RotateCcw size={12} strokeWidth={1.5} />
            {t("result.retake")}
          </button>
        )}
        <button
          onClick={() => downloadImage(stripUrl)}
          className="flex items-center gap-1.5 rounded-full bg-[#2C2C2A] px-4 py-2 text-[11px] tracking-wide text-[#F5F2EA] transition-all duration-400 hover:bg-[#3d3d3a] sm:px-5 sm:py-2.5 sm:text-xs"
        >
          <Download size={12} strokeWidth={1.5} />
          {t("result.save")}
        </button>
        <button
          onClick={share}
          disabled={sharing}
          className="flex items-center gap-1.5 rounded-full border border-[#D4A574]/20 px-4 py-2 text-[11px] tracking-wide text-[#B5864F] transition-all duration-400 hover:border-[#D4A574]/40 hover:bg-[#D4A574]/5 disabled:opacity-60 sm:px-5 sm:py-2.5 sm:text-xs"
        >
          <Share2 size={12} strokeWidth={1.5} />
          {shared ? t("result.shared") : t("result.share")}
        </button>
      </motion.div>
    </motion.div>
  );
}
