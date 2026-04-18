"use client";

import { motion } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState, useCallback } from "react";

interface ShareCardProps {
  url: string;
  code: string;
}

export default function ShareCard({ url, code }: ShareCardProps) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text
    }
  }, [url]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center gap-5 rounded-xl border border-[#DDD9D0] bg-[#FDFCF9] p-6 shadow-sm sm:p-8"
    >
      <p className="text-xs tracking-wide text-[#8A8780] sm:text-sm">
        send this to your friend
      </p>

      {/* QR code */}
      <div className="rounded-lg border border-[#EDE9DF] bg-white p-3">
        <QRCodeSVG
          value={url}
          size={140}
          bgColor="#FFFFFF"
          fgColor="#2C2C2A"
          level="M"
        />
      </div>

      {/* room code */}
      <div className="flex flex-col items-center gap-1.5">
        <span className="font-mono text-2xl font-medium tracking-[0.15em] text-[#2C2C2A] sm:text-3xl">
          {code}
        </span>
        <span className="text-[10px] tracking-wide text-[#8A8780] uppercase">
          room code
        </span>
      </div>

      {/* copy link */}
      <button
        onClick={copy}
        className="flex items-center gap-1.5 rounded-full border border-[#DDD9D0] px-4 py-2 text-xs text-[#2C2C2A] transition-all duration-300 hover:border-[#D4A574] hover:bg-[#F5F2EA] sm:text-sm"
      >
        {copied ? (
          <>
            <Check size={13} className="text-[#D4A574]" />
            copied
          </>
        ) : (
          <>
            <Copy size={13} />
            copy link
          </>
        )}
      </button>
    </motion.div>
  );
}
