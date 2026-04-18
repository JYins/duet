"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Camera } from "lucide-react";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-[#F5F2EA] px-6">
      {/* film grain texture overlay */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative flex flex-col items-center gap-10 text-center">
        {/* title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-4"
        >
          <h1 className="font-serif text-6xl font-light italic tracking-tight text-[#2C2C2A]">
            duet
          </h1>
          <div className="h-px w-12 bg-[#D4A574]/40" />
        </motion.div>

        {/* tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="max-w-xs text-sm leading-relaxed tracking-wide text-[#8A8780]"
        >
          take photos together, even when you are apart.
          <br />
          on-device portrait segmentation, shared backgrounds,
          <br />
          unified color grading. one strip, two places.
        </motion.p>

        {/* cta */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Link
            href="/booth"
            className="group flex items-center gap-2.5 rounded-full border border-[#2C2C2A] px-7 py-3 text-sm tracking-wide text-[#2C2C2A] transition-all duration-500 hover:bg-[#2C2C2A] hover:text-[#F5F2EA]"
          >
            <Camera
              size={15}
              className="transition-transform duration-500 group-hover:scale-110"
            />
            start shooting
          </Link>
        </motion.div>

        {/* subtle bottom mark */}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute -bottom-20 text-[10px] tracking-[0.2em] text-[#D4A574]/40 uppercase"
        >
          collaborative photo booth
        </motion.span>
      </div>
    </main>
  );
}
