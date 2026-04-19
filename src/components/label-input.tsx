"use client";

import { useLocale } from "@/hooks/use-locale";

interface LabelInputProps {
  value: string;
  onChange: (v: string) => void;
}

export default function LabelInput({ value, onChange }: LabelInputProps) {
  const { t } = useLocale();

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={t("booth.labelPlaceholder")}
      maxLength={40}
      className="w-48 rounded-full border border-[#2C2C2A]/[0.06] bg-[#FDFCF9] px-4 py-2 text-center font-serif text-xs italic text-[#2C2C2A] placeholder:text-[#DDD9D0] focus:border-[#D4A574]/30 focus:outline-none sm:w-56 sm:text-sm"
    />
  );
}
