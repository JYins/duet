"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Camera } from "lucide-react";

export default function Home() {
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
          take photos together, even when you are apart.
          <br className="hidden sm:block" />
          {" "}on-device portrait segmentation, shared backgrounds,
          <br className="hidden sm:block" />
          {" "}unified color grading. one strip, two places.
        </motion.p>

        {/* cta */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Link
            href="/booth"
            className="group flex items-center gap-2 rounded-full border border-[#2C2C2A] px-6 py-2.5 text-xs tracking-wide text-[#2C2C2A] transition-all duration-500 hover:bg-[#2C2C2A] hover:text-[#F5F2EA] active:scale-95 sm:gap-2.5 sm:px-7 sm:py-3 sm:text-sm"
          >
            <Camera
              size={14}
              className="transition-transform duration-500 group-hover:scale-110 sm:h-[15px] sm:w-[15px]"
            />
            start shooting
          </Link>
        </motion.div>

        {/* bottom mark */}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute -bottom-16 text-[8px] tracking-[0.15em] text-[#D4A574]/40 uppercase sm:-bottom-20 sm:text-[10px] sm:tracking-[0.2em]"
        >
          collaborative photo booth
        </motion.span>
      </div>
    </main>
  );
}
