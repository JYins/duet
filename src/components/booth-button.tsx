"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BoothButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "icon";
}

export default function BoothButton({
  children,
  icon,
  variant = "primary",
  size = "md",
  className,
  ...props
}: BoothButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition duration-300 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-35",
        variant === "primary" &&
          "bg-[#2C2C2A] text-[#F9F6EE] shadow-[0_14px_32px_rgba(44,44,42,0.12)] hover:bg-[#3A3935]",
        variant === "secondary" &&
          "border border-[#2C2C2A]/10 bg-[#FDFCF9]/85 text-[#2C2C2A] hover:border-[#D4A574]/45",
        variant === "ghost" &&
          "text-[#7D786E] hover:bg-[#2C2C2A]/5 hover:text-[#2C2C2A]",
        size === "md" && "min-h-11 px-5 text-[13px]",
        size === "sm" && "min-h-9 px-4 text-[12px]",
        size === "icon" && "h-12 w-12 px-0",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
