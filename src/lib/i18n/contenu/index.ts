import type { Locale } from "@/lib/i18n/locales";
import { getTemplate } from "@/data/objetTemplates";
import { OBJETS_EN } from "./en/objets";
import { OBJETS_ES } from "./es/objets";
import { BROCANTES_EN } from "./en/brocantes";
import { BROCANTES_ES } from "./es/brocantes";
import { COMPETENCES_EN } from "./en/competences";
import { COMPETENCES_ES } from "./es/competences";
import { DEBLOCAGES_EN } from "./en/deblocages";
import { DEBLOCAGES_ES } from "./es/deblocages";

/** Forme d'un overlay de compétences par langue (arbres / branches / paliers). */
export interface OverlayCompetences {
  arbres: Record<string, { nom: string; baseline: string }>;
  branches: Record<string, { nom: string; description?: string }>;
  paliers: Record<string, { nom: string; description: string }>;
}

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

const BROCANTES_OVERLAY: Record<
  "en" | "es",
  Record<string, { nom: string; description: string }>
> = {
  en: BROCANTES_EN,
  es: BROCANTES_ES,
};

/** Nom localisé d'une brocante. Id absent de l'overlay → nom FR passé en argument. */
export function nomBrocante(b: { id: string; nom: string }, locale: Locale): string {
  if (locale !== "fr") {
    const trad = BROCANTES_OVERLAY[locale][b.id]?.nom;
    if (trad) return trad;
  }
  return b.nom;
}

/** Description localisée d'une brocante. Id absent de l'overlay → description FR passée en argument. */
export function descriptionBrocante(
  b: { id: string; description: string },
  locale: Locale,
): string {
  if (locale !== "fr") {
    const trad = BROCANTES_OVERLAY[locale][b.id]?.description;
    if (trad) return trad;
  }
  return b.description;
}

/* ------------------------------------------------------------------ */
/* Compétences : arbres, branches, paliers (overlay imbriqué)          */
/* ------------------------------------------------------------------ */

const COMPETENCES_OVERLAY: Record<"en" | "es", OverlayCompetences> = {
  en: COMPETENCES_EN,
  es: COMPETENCES_ES,
};

/** Nom localisé d'un arbre. Id absent de l'overlay → nom FR passé en argument. */
export function nomArbre(t: { id: string; nom: string }, locale: Locale): string {
  if (locale !== "fr") {
    const trad = COMPETENCES_OVERLAY[locale].arbres[t.id]?.nom;
    if (trad) return trad;
  }
  return t.nom;
}

/** Baseline localisée d'un arbre. Id absent de l'overlay → baseline FR passée en argument. */
export function baselineArbre(t: { id: string; baseline: string }, locale: Locale): string {
  if (locale !== "fr") {
    const trad = COMPETENCES_OVERLAY[locale].arbres[t.id]?.baseline;
    if (trad) return trad;
  }
  return t.baseline;
}

/** Nom localisé d'une branche. Clé = `${treeId}/${brancheId}` ; fallback FR. */
export function nomBranche(
  treeId: string,
  b: { id: string; nom: string },
  locale: Locale,
): string {
  if (locale !== "fr") {
    const trad = COMPETENCES_OVERLAY[locale].branches[`${treeId}/${b.id}`]?.nom;
    if (trad) return trad;
  }
  return b.nom;
}

/**
 * Description localisée d'une branche. Certaines branches n'en ont pas (arbres
 * thématiques) → `undefined` conservé dans les deux sens. Fallback FR sinon.
 */
export function descriptionBranche(
  treeId: string,
  b: { id: string; description?: string },
  locale: Locale,
): string | undefined {
  if (locale !== "fr") {
    const trad = COMPETENCES_OVERLAY[locale].branches[`${treeId}/${b.id}`]?.description;
    if (trad) return trad;
  }
  return b.description;
}

/** Nom localisé d'un palier de compétence. Id absent de l'overlay → nom FR passé en argument. */
export function nomCompetence(c: { id: string; nom: string }, locale: Locale): string {
  if (locale !== "fr") {
    const trad = COMPETENCES_OVERLAY[locale].paliers[c.id]?.nom;
    if (trad) return trad;
  }
  return c.nom;
}

/** Description localisée d'un palier de compétence. Id absent de l'overlay → description FR. */
export function descriptionCompetence(
  c: { id: string; description: string },
  locale: Locale,
): string {
  if (locale !== "fr") {
    const trad = COMPETENCES_OVERLAY[locale].paliers[c.id]?.description;
    if (trad) return trad;
  }
  return c.description;
}

/* ------------------------------------------------------------------ */
/* Déblocages de niveau (overlay Record<titreFR, string>)             */
/* ------------------------------------------------------------------ */

const DEBLOCAGES_OVERLAY: Record<"en" | "es", Record<string, string>> = {
  en: DEBLOCAGES_EN,
  es: DEBLOCAGES_ES,
};

/** Titre localisé d'un déblocage. Clé = titre FR canonique ; fallback FR. */
export function titreDeblocage(dep: { titre: string }, locale: Locale): string {
  if (locale !== "fr") {
    const trad = DEBLOCAGES_OVERLAY[locale][dep.titre];
    if (trad) return trad;
  }
  return dep.titre;
}

/** Utils des tests de complétude par domaine. */
export function manquants<T>(ids: string[], overlay: Record<string, T>): string[] {
  return ids.filter((id) => !(id in overlay));
}
export function orphelins<T>(ids: string[], overlay: Record<string, T>): string[] {
  const connus = new Set(ids);
  return Object.keys(overlay).filter((k) => !connus.has(k));
}
