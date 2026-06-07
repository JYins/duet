"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Camera, KeyRound, Users } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import BoothShell from "@/components/booth-shell";

export default function Home() {
  const router = useRouter();
  const { t } = useLocale();
  const [joinCode, setJoinCode] = useState("");
  const demoLabels = [
    t("landing.demoFilm"),
    t("landing.demoGhost"),
    t("landing.demoGrain"),
    t("landing.demoShare"),
  ];

  const join = useCallback(() => {
    const code = joinCode.trim().toLowerCase();
    if (code.length >= 4) router.push(`/room/${code}`);
  }, [joinCode, router]);

  return (
    <BoothShell showLocale>
      <div className="flex flex-1 flex-col justify-between gap-8 py-4">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-8"
        >
          <div className="space-y-5">
            <h1 className="max-w-[16rem] font-serif text-[3.2rem] font-light italic leading-[0.92] text-[#2C2C2A]">
              Take the soft booth home.
            </h1>
            <p className="max-w-[18rem] whitespace-pre-line text-[14px] leading-7 text-[#766F64]">
              {t("landing.tagline")}
            </p>
          </div>

          <div className="rounded-[1.7rem] border border-[#2C2C2A]/10 bg-[#FDFCF9]/72 p-4 shadow-[0_18px_50px_rgba(44,44,42,0.07)]">
            <div className="aspect-[3/4] overflow-hidden rounded-[1.25rem] bg-[#D9CBBB] p-4">
              <div className="grid h-full grid-cols-2 gap-3">
                {demoLabels.map((label, index) => (
                  <div
                    key={label}
                    className="relative overflow-hidden rounded-xl bg-[#F8F2E8] shadow-inner"
                  >
                    <div className="absolute inset-x-3 top-3 h-10 rounded-full bg-white/55 blur-md" />
                    <div className="absolute inset-x-4 bottom-4 h-24 rounded-full bg-[#C39A70]/20 blur-xl" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <span className="rounded-full bg-[#2C2C2A]/65 px-2.5 py-1 text-[10px] text-white">
                        {index + 1}. {label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-3">
            <Link
              href="/create"
              className="flex min-h-14 items-center justify-between rounded-full bg-[#2C2C2A] px-5 text-[14px] font-medium text-[#F5F2EA] shadow-[0_18px_38px_rgba(44,44,42,0.14)]"
            >
              <span className="flex items-center gap-2.5">
                <Users size={18} strokeWidth={1.5} />
                {t("landing.startDuet")}
              </span>
              <ArrowRight size={17} strokeWidth={1.5} />
            </Link>
            <Link
              href="/booth"
              className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#2C2C2A]/10 bg-[#FDFCF9]/70 px-5 text-[13px] font-medium text-[#2C2C2A]"
            >
              <Camera size={17} strokeWidth={1.5} />
              {t("landing.soloBooth")}
            </Link>
          </div>

          <div className="rounded-[1.35rem] border border-[#2C2C2A]/10 bg-[#FDFCF9]/60 p-3">
            <div className="mb-2 flex items-center gap-2 px-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#A99472]">
              <KeyRound size={13} strokeWidth={1.5} />
              {t("landing.haveCode")}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") join();
                }}
                placeholder="7G2K"
                maxLength={8}
                className="min-w-0 flex-1 rounded-full border border-[#2C2C2A]/10 bg-[#FDFCF9] px-4 py-3 text-center font-mono text-[13px] uppercase tracking-[0.22em] text-[#2C2C2A] placeholder:text-[#CFC7BA] focus:border-[#D4A574]/50 focus:outline-none"
              />
              <button
                type="button"
                onClick={join}
                disabled={joinCode.trim().length < 4}
                className="rounded-full bg-[#D4A574] px-5 text-[13px] font-medium text-white disabled:opacity-35"
              >
                {t("landing.join")}
              </button>
            </div>
          </div>

          <p className="text-center text-[10px] uppercase tracking-[0.18em] text-[#B5B2AB]">
            {t("landing.footer")}
          </p>
        </motion.section>
      </div>
    </BoothShell>
  );
}
