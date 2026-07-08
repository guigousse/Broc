"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  detecterLocale,
  persisterLocale,
  type Locale,
} from "@/lib/i18n/locales";
import { DICTIONNAIRES, tr, type DictionnaireUI } from "@/lib/i18n/ui";

interface ValeurLangue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  d: DictionnaireUI;
  tr: typeof tr;
}

/**
 * Valeur par défaut FRANÇAISE : un composant rendu hors provider (tests
 * unitaires) affiche le français sans wrapper. setLocale y est un no-op.
 */
const LangueContext = createContext<ValeurLangue>({
  locale: "fr",
  setLocale: () => {},
  d: DICTIONNAIRES.fr,
  tr,
});

export function LangueProvider({ children }: { children: ReactNode }) {
  // "fr" au premier rendu (SSG) puis détection au montage : évite tout
  // mismatch d'hydratation avec l'export statique.
  // Conséquence assumée : sur navigateur non-FR, premier paint en français
  // puis bascule (flash d'une frame) — inhérent à l'export statique sans
  // détection SSR.
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    setLocaleState(detecterLocale());
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    persisterLocale(l);
  }, []);

  return (
    <LangueContext.Provider
      value={{ locale, setLocale, d: DICTIONNAIRES[locale], tr }}
    >
      {children}
    </LangueContext.Provider>
  );
}

export function useLangue(): ValeurLangue {
  return useContext(LangueContext);
}
