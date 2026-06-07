"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { LocaleContext, detectLocale } from "@/hooks/use-locale";
import { isLocale, type Locale, type TranslationKey, t } from "@/lib/i18n";

const STORAGE_KEY = "duet-locale";

export default function LocaleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const restore = window.setTimeout(() => {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      setLocaleState(isLocale(stored) ? stored : detectLocale());
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

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
