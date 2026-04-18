"use client";

import { createContext, useContext } from "react";
import { type Locale, type TranslationKey, t, detectLocale } from "@/lib/i18n";

export interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
}

export const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  setLocale: () => {},
  t: (key) => t(key, "en"),
});

export function useLocale() {
  return useContext(LocaleContext);
}

export { detectLocale };
