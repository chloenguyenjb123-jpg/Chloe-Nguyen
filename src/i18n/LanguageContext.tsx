import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { LanguageCode, ThemeVariant } from '../types';
import { TRANSLATIONS, type TranslationDictionary } from './translations';

const LANG_STORAGE_KEY = 'dailyhub_lang';
const THEME_STORAGE_KEY = 'dailyhub_theme';

interface LanguageContextValue {
  lang: LanguageCode;
  setLang: (next: LanguageCode) => void;
  t: TranslationDictionary;
  theme: ThemeVariant;
  setTheme: (next: ThemeVariant) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LanguageCode>(() => {
    try {
      const stored = localStorage.getItem(LANG_STORAGE_KEY);
      return stored === 'en' ? 'en' : 'vi';
    } catch {
      return 'vi';
    }
  });

  const [theme, setThemeState] = useState<ThemeVariant>(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      return stored === 'soft_blush' ? 'soft_blush' : 'warm_ivory';
    } catch {
      return 'warm_ivory';
    }
  });

  const setLang = useCallback((next: LanguageCode) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // Ignore storage errors
    }
    document.documentElement.lang = next;
  }, []);

  const setTheme = useCallback((next: ThemeVariant) => {
    setThemeState(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore storage errors
    }
    document.documentElement.setAttribute('data-theme', next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.setAttribute('data-theme', theme);
  }, [lang, theme]);

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLang,
        t: TRANSLATIONS[lang],
        theme,
        setTheme,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useI18n(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useI18n must be used within LanguageProvider');
  }
  return ctx;
}
