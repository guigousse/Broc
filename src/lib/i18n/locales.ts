import {
  safeLocalStorageGet,
  safeLocalStorageSet,
} from "@/lib/storage/safeLocalStorage";

/** Langues jouables. Le français est la langue canonique du contenu. */
export type Locale = "fr" | "en" | "es";

export const LOCALES: readonly Locale[] = ["fr", "en", "es"];

/** Autonymes affichés dans le sélecteur (identiques dans toutes les langues). */
export const LOCALE_LABELS: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
};

const CLE = "projet-broc:langue:v1";

interface LanguePref {
  locale: Locale;
}

function estLocale(v: unknown): v is Locale {
  return v === "fr" || v === "en" || v === "es";
}

/**
 * Préférence persistée si valide, sinon langue du téléphone (fr/es),
 * sinon anglais — la langue de repli internationale.
 */
export function detecterLocale(): Locale {
  const pref = safeLocalStorageGet<Partial<LanguePref>>(CLE, {});
  if (estLocale(pref.locale)) return pref.locale;
  const nav =
    typeof navigator !== "undefined" ? navigator.language.toLowerCase() : "";
  if (nav.startsWith("fr")) return "fr";
  if (nav.startsWith("es")) return "es";
  return "en";
}

export function persisterLocale(locale: Locale): void {
  safeLocalStorageSet(CLE, { locale } satisfies LanguePref);
}

/**
 * Locale effective, utilisable HORS React (les modules de notifications ne
 * sont pas des composants) : même logique que `LangueProvider` — préférence
 * persistée sinon détection navigateur. SSR-safe : replie sur `"fr"` quand
 * `window` est absent, comme le premier rendu du provider (évite tout écart
 * avec l'export statique — `detecterLocale()` seule retomberait sur `"en"`
 * côté serveur faute de `navigator`).
 */
export function localeCourante(): Locale {
  if (typeof window === "undefined") return "fr";
  return detecterLocale();
}
