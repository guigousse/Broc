import type { Locale } from "@/lib/i18n/locales";
import { fr } from "./fr";
import { en } from "./en";
import { es } from "./es";

/**
 * Forme du dictionnaire : celle du français, valeurs relâchées en `string`
 * (sinon les littéraux `as const` exigeraient les mêmes textes partout).
 */
type DeepStrings<T> = {
  [K in keyof T]: T[K] extends object ? DeepStrings<T[K]> : string;
};
export type DictionnaireUI = DeepStrings<typeof fr>;

export const DICTIONNAIRES: Record<Locale, DictionnaireUI> = { fr, en, es };

/**
 * Interpolation `{param}`. Un paramètre absent laisse le marqueur visible —
 * volontaire : un `{n}` à l'écran se repère, un texte silencieusement faux non.
 */
export function tr(
  gabarit: string,
  params?: Record<string, string | number>,
): string {
  return gabarit.replace(/\{(\w+)\}/g, (tout, cle: string) =>
    params && cle in params ? String(params[cle]) : tout,
  );
}
