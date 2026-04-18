"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { LocaleContext, detectLocale } from "@/hooks/use-locale";
import { type Locale, type TranslationKey, t } from "@/lib/i18n";

const STORAGE_KEY = "duet-locale";

export default function LocaleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // detect or restore on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    setLocaleState(stored || detectLocale());
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const translate = useCallback(
    (key: TranslationKey) => t(key, locale),
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t: translate }),
    [locale, setLocale, translate],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}
