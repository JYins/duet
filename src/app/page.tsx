"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Camera, Users } from "lucide-react";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");

  const join = useCallback(() => {
    const code = joinCode.trim().toLowerCase();
    if (code.length >= 4) {
      router.push(`/room/${code}`);
    }
  }, [joinCode, router]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-[#F5F2EA] px-5 sm:px-6">
      {/* film grain texture */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative flex flex-col items-center gap-8 text-center sm:gap-10">
        {/* title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-3 sm:gap-4"
        >
          <h1 className="font-serif text-5xl font-light italic tracking-tight text-[#2C2C2A] sm:text-6xl">
            duet
          </h1>
          <div className="h-px w-10 bg-[#D4A574]/40 sm:w-12" />
        </motion.div>

        {/* tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="max-w-[280px] text-xs leading-relaxed tracking-wide text-[#8A8780] sm:max-w-xs sm:text-sm"
        >
          take photos together, even when you are apart
        </motion.p>

        {/* action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4"
        >
          <Link
            href="/create"
            className="group flex items-center gap-2 rounded-full border border-[#2C2C2A] px-6 py-2.5 text-xs tracking-wide text-[#2C2C2A] transition-all duration-500 hover:bg-[#2C2C2A] hover:text-[#F5F2EA] active:scale-95 sm:px-7 sm:py-3 sm:text-sm"
          >
            <Users size={14} className="sm:h-[15px] sm:w-[15px]" />
            start a duet
          </Link>
          <Link
            href="/booth"
            className="flex items-center gap-2 rounded-full border border-[#DDD9D0] px-6 py-2.5 text-xs tracking-wide text-[#8A8780] transition-all duration-500 hover:border-[#D4A574] hover:text-[#2C2C2A] active:scale-95 sm:px-7 sm:py-3 sm:text-sm"
          >
            <Camera size={14} className="sm:h-[15px] sm:w-[15px]" />
            solo booth
          </Link>
        </motion.div>

        {/* join room */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="flex flex-col items-center gap-2"
        >
          <span className="text-[10px] tracking-wide text-[#8A8780] uppercase sm:text-[11px]">
            have a room code?
          </span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && join()}
              placeholder="enter code"
              maxLength={8}
              className="w-32 rounded-full border border-[#DDD9D0] bg-transparent px-4 py-2 text-center font-mono text-xs tracking-widest text-[#2C2C2A] placeholder:text-[#DDD9D0] focus:border-[#D4A574] focus:outline-none sm:w-36 sm:text-sm"
            />
            <button
              onClick={join}
              disabled={joinCode.trim().length < 4}
              className="rounded-full bg-[#2C2C2A] px-4 py-2 text-xs text-[#F5F2EA] transition-opacity hover:opacity-80 disabled:opacity-30 sm:text-sm"
            >
              join
            </button>
          </div>
        </motion.div>

        {/* bottom mark */}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="absolute -bottom-14 text-[8px] tracking-[0.15em] text-[#D4A574]/40 uppercase sm:-bottom-20 sm:text-[10px] sm:tracking-[0.2em]"
        >
          collaborative photo booth
        </motion.span>
      </div>
    </main>
  );
}
