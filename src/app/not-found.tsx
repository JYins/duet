"use client";

import Link from "next/link";
import { useLocale } from "@/hooks/use-locale";

export default function NotFound() {
  const { t } = useLocale();

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-[#F5F2EA] px-6">
      <div className="flex flex-col items-center gap-8 text-center">
        <div className="flex flex-col items-center gap-2">
          <span className="font-serif text-[5rem] font-light italic leading-none text-[#2C2C2A]/10">
            ?
          </span>
          <h1 className="font-serif text-2xl font-light italic text-[#2C2C2A]">
            {t("notFound.title")}
          </h1>
        </div>
        <p className="text-xs tracking-wide text-[#8A8780]">
          {t("notFound.body")}
        </p>
        <Link
          href="/"
          className="rounded-full border border-[#2C2C2A]/10 px-6 py-2.5 text-[11px] tracking-wide text-[#2C2C2A]/70 transition-all duration-500 hover:border-[#D4A574]/30 hover:text-[#2C2C2A]"
        >
          {t("notFound.back")}
        </Link>
      </div>
    </main>
  );
}
