"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import LocaleSwitcher from "./locale-switcher";

interface BoothShellProps {
  eyebrow?: string;
  code?: string;
  step?: string;
  children: ReactNode;
  footer?: ReactNode;
  showLocale?: boolean;
}

export default function BoothShell({
  eyebrow,
  code,
  step,
  children,
  footer,
  showLocale = false,
}: BoothShellProps) {
  const { t } = useLocale();

  return (
    <main className="booth-screen">
      <div className="booth-noise" />
      <div className="booth-phone">
        <header className="booth-header">
          <Link href="/" className="booth-brand" aria-label="Duet home">
            Duet
          </Link>
          <div className="flex min-w-0 flex-col items-center gap-1">
            {step && <span className="booth-step">{step}</span>}
            {code && <span className="booth-code">{t("shell.room")} {code}</span>}
            {!step && eyebrow && <span className="booth-kicker">{eyebrow}</span>}
          </div>
          <div className="flex min-w-[4.75rem] justify-end">
            {showLocale ? (
              <LocaleSwitcher />
            ) : (
              <button
                type="button"
                className="booth-guide"
                aria-label={t("shell.guide")}
                title={t("shell.guide")}
              >
                <HelpCircle size={16} strokeWidth={1.5} />
                <span>{t("shell.guide")}</span>
              </button>
            )}
          </div>
        </header>
        <div className="booth-content">{children}</div>
        {footer && <footer className="booth-footer">{footer}</footer>}
      </div>
    </main>
  );
}
