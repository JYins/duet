"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Camera, Users, ArrowRight } from "lucide-react";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/hooks/use-locale";
import LocaleSwitcher from "@/components/locale-switcher";

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15, delayChildren: 0.2 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } },
};

const fadeSlow: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 1.4, ease: "easeOut" } },
};

export default function Home() {
  const router = useRouter();
  const { t } = useLocale();
  const [joinCode, setJoinCode] = useState("");
  const [focused, setFocused] = useState(false);

  const join = useCallback(() => {
    const code = joinCode.trim().toLowerCase();
    if (code.length >= 4) router.push(`/room/${code}`);
  }, [joinCode, router]);

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-[#F5F2EA]">
      {/* grain texture */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-[#D4A574]/[0.04] blur-[120px]" />

      {/* locale switcher — top right */}
      <div className="fixed top-[max(env(safe-area-inset-top),1rem)] right-4 z-20 sm:right-6">
        <LocaleSwitcher />
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative z-10 flex flex-col items-center px-5 sm:px-6"
      >
        {/* brand — always "Duet" */}
        <motion.div variants={fadeUp} className="flex flex-col items-center">
          <h1 className="font-serif text-[clamp(3.5rem,12vw,7rem)] font-light italic leading-[0.9] tracking-tight text-[#2C2C2A]">
            Duet
          </h1>
          <motion.div
            variants={fadeSlow}
            className="mt-4 h-px w-16 bg-gradient-to-r from-transparent via-[#D4A574]/50 to-transparent"
          />
        </motion.div>

        {/* tagline */}
        <motion.p
          variants={fadeUp}
          className="mt-8 max-w-[260px] whitespace-pre-line text-center text-[13px] leading-[1.7] tracking-[0.02em] text-[#8A8780] sm:max-w-xs sm:text-sm"
        >
          {t("landing.tagline")}
        </motion.p>

        {/* actions */}
        <motion.div
          variants={fadeUp}
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4"
        >
          <Link
            href="/create"
            className="group flex items-center gap-2.5 rounded-full bg-[#2C2C2A] px-7 py-3 text-[13px] tracking-wide text-[#F5F2EA] transition-all duration-500 hover:shadow-lg hover:shadow-[#2C2C2A]/10 active:scale-[0.97]"
          >
            <Users size={14} strokeWidth={1.5} />
            {t("landing.startDuet")}
            <ArrowRight
              size={13}
              strokeWidth={1.5}
              className="ml-0.5 opacity-0 transition-all duration-500 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0"
            />
          </Link>
          <Link
            href="/booth"
            className="flex items-center gap-2.5 rounded-full border border-[#2C2C2A]/10 px-7 py-3 text-[13px] tracking-wide text-[#2C2C2A]/70 transition-all duration-500 hover:border-[#D4A574]/40 hover:text-[#2C2C2A] active:scale-[0.97]"
          >
            <Camera size={14} strokeWidth={1.5} />
            {t("landing.soloBooth")}
          </Link>
        </motion.div>

        {/* join code */}
        <motion.div
          variants={fadeUp}
          className="mt-12 flex flex-col items-center gap-2.5"
        >
          <span className="text-[10px] tracking-[0.12em] text-[#B5B2AB] uppercase">
            {t("landing.haveCode")}
          </span>
          <div className="flex items-center gap-2">
            <div
              className={`relative rounded-full transition-all duration-500 ${
                focused ? "ring-1 ring-[#D4A574]/30" : ""
              }`}
            >
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && join()}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="· · · · · ·"
                maxLength={8}
                className="w-[120px] rounded-full border border-[#2C2C2A]/[0.06] bg-[#FDFCF9] px-4 py-2 text-center font-mono text-xs tracking-[0.2em] text-[#2C2C2A] placeholder:text-[#DDD9D0] focus:border-[#D4A574]/30 focus:outline-none sm:w-[130px]"
              />
            </div>
            <button
              onClick={join}
              disabled={joinCode.trim().length < 4}
              className="rounded-full bg-[#2C2C2A] px-4 py-2 text-xs text-[#F5F2EA] transition-all duration-300 hover:bg-[#3d3d3a] disabled:opacity-20"
            >
              {t("landing.join")}
            </button>
          </div>
        </motion.div>

        {/* footer */}
        <motion.div
          variants={fadeSlow}
          className="mt-20 flex flex-col items-center gap-1.5"
        >
          <div className="h-px w-6 bg-[#D4A574]/20" />
          <span className="text-[8px] tracking-[0.2em] text-[#D4A574]/30 uppercase sm:text-[9px]">
            {t("landing.footer")}
          </span>
        </motion.div>
      </motion.div>
    </main>
  );
}
