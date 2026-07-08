import type { Locale } from "@/lib/i18n/locales";
import { getTemplate } from "@/data/objetTemplates";
import { OBJETS_EN } from "./en/objets";
import { OBJETS_ES } from "./es/objets";

/**
 * Overlays de contenu (spec i18n §2) : le français de `src/data/` est
 * canonique, EN/ES sont des Record<Id, …> résolus À L'AFFICHAGE.
 * Fallback FR si entrée absente — jamais de crash, jamais d'écriture en save.
 */
const OBJETS: Record<"en" | "es", Record<string, string>> = {
  en: OBJETS_EN,
  es: OBJETS_ES,
};

/** Nom localisé d'un template d'objet. Id inconnu → id brut (marqueur repérable). */
export function nomTemplate(templateId: string, locale: Locale): string {
  const fr = getTemplate(templateId)?.nom;
  if (locale !== "fr") {
    const trad = OBJETS[locale][templateId];
    if (trad) return trad;
  }
  return fr ?? templateId;
}

/**
 * Nom localisé d'un objet/slot possédé. Le champ `nom` persisté est un
 * snapshot FR hérité (règle d'or : plus jamais affiché tel quel) — on résout
 * par templateId ; le snapshot ne sert que de repli (templateId "legacy").
 */
export function nomObjet(
  o: { templateId: string; nom: string },
  locale: Locale,
): string {
  if (locale !== "fr") {
    const trad = OBJETS[locale][o.templateId];
    if (trad) return trad;
  }
  return getTemplate(o.templateId)?.nom ?? o.nom;
}

/** Utils des tests de complétude par domaine. */
export function manquants<T>(ids: string[], overlay: Record<string, T>): string[] {
  return ids.filter((id) => !(id in overlay));
}
export function orphelins<T>(ids: string[], overlay: Record<string, T>): string[] {
  const connus = new Set(ids);
  return Object.keys(overlay).filter((k) => !connus.has(k));
}
