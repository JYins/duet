"use client";

import { motion } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState, useCallback } from "react";
import { useLocale } from "@/hooks/use-locale";

interface ShareCardProps {
  url: string;
  code: string;
}

export default function ShareCard({ url, code }: ShareCardProps) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  }, [url]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl border border-[#2C2C2A]/[0.05] bg-[#FDFCF9] shadow-sm"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
      <div className="relative flex flex-col items-center gap-5 px-8 py-7 sm:px-10 sm:py-9">
        <div className="flex flex-col items-center gap-1">
          <span className="font-serif text-sm italic text-[#2C2C2A]/40">Duet</span>
          <span className="text-[10px] tracking-[0.12em] text-[#B5B2AB] uppercase">
            {t("share.scanToJoin")}
          </span>
        </div>
        <div className="rounded-xl border border-[#2C2C2A]/[0.04] bg-white p-3.5">
          <QRCodeSVG value={url} size={130} bgColor="#FFFFFF" fgColor="#2C2C2A" level="M" />
        </div>
        <div className="flex w-full items-center gap-3">
          <div className="h-px flex-1 bg-[#2C2C2A]/[0.04]" />
          <span className="text-[9px] tracking-[0.15em] text-[#D4A574]/50 uppercase">
            {t("share.or")}
          </span>
          <div className="h-px flex-1 bg-[#2C2C2A]/[0.04]" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="font-mono text-[28px] font-medium tracking-[0.18em] text-[#2C2C2A] sm:text-[32px]">
            {code}
          </span>
          <span className="text-[9px] tracking-[0.1em] text-[#B5B2AB] uppercase">
            {t("share.roomCode")}
          </span>
        </div>
        <button
          onClick={copy}
          className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-[11px] tracking-wide transition-all duration-500 ${
            copied
              ? "border border-[#D4A574]/30 text-[#D4A574]"
              : "border border-[#2C2C2A]/[0.08] text-[#8A8780] hover:border-[#D4A574]/20 hover:text-[#2C2C2A]"
          }`}
        >
          {copied ? (
            <>
              <Check size={12} strokeWidth={1.5} />
              {t("share.linkCopied")}
            </>
          ) : (
            <>
              <Copy size={12} strokeWidth={1.5} />
              {t("share.copyLink")}
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
