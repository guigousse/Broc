import type { Locale } from "@/lib/i18n/locales";
import type { VendeurArchetypeId } from "@/types/game";
import { getTemplate } from "@/data/objetTemplates";
import { NOM_ARCHETYPE, NOM_VENDEUR, getNomVendeur } from "@/lib/personas";
import { EXPEDITEURS } from "@/data/expediteursCourrier";
import { OBJETS_EN } from "./en/objets";
import { OBJETS_ES } from "./es/objets";
import { BROCANTES_EN } from "./en/brocantes";
import { BROCANTES_ES } from "./es/brocantes";
import { COMPETENCES_EN } from "./en/competences";
import { COMPETENCES_ES } from "./es/competences";
import { DEBLOCAGES_EN } from "./en/deblocages";
import { DEBLOCAGES_ES } from "./es/deblocages";
import { PERSONNAGES_EN, type OverlayPersonnages } from "./en/personnages";
import { PERSONNAGES_ES } from "./es/personnages";

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

/* ------------------------------------------------------------------ */
/* Personnages : clients (vente), vendeurs (chine), expéditeurs        */
/* ------------------------------------------------------------------ */

const PERSONNAGES_OVERLAY: Record<"en" | "es", OverlayPersonnages> = {
  en: PERSONNAGES_EN,
  es: PERSONNAGES_ES,
};

/**
 * Les 4 archétypes vendeurs « commanditaires » n'ont pas de nom propre à eux :
 * ils empruntent celui de l'expéditeur de courrier correspondant (source unique
 * — cf. `NOM_VENDEUR` dans `src/lib/personas.ts`). On résout donc via
 * `nomExpediteur`, jamais par une entrée dupliquée dans l'overlay `vendeurs`.
 */
const VENDEUR_COMMANDITAIRE_EXP: Partial<Record<VendeurArchetypeId, string>> = {
  joueur: "jeux-video",
  setdesigner: "set-designer",
  modeuse: "mode",
  esthete: "art",
};

/** Nom localisé d'un client (vente). Id absent de l'overlay → nom FR passé en argument. */
export function nomClient(p: { id: string; nom: string }, locale: Locale): string {
  if (locale !== "fr") {
    const trad = PERSONNAGES_OVERLAY[locale].personnages[p.id]?.nom;
    if (trad) return trad;
  }
  return p.nom;
}

/** Ambiance localisée d'un client (texte affiché). Id absent → ambiance FR passée en argument. */
export function ambianceClient(
  p: { id: string; ambiance: string },
  locale: Locale,
): string {
  if (locale !== "fr") {
    const trad = PERSONNAGES_OVERLAY[locale].personnages[p.id]?.ambiance;
    if (trad) return trad;
  }
  return p.ambiance;
}

/** Nom localisé d'un archétype de client. Id absent de l'overlay → fallback FR fourni. */
export function nomArchetypeClient(
  archetypeId: string,
  fallbackFr: string,
  locale: Locale,
): string {
  if (locale !== "fr") {
    const trad = PERSONNAGES_OVERLAY[locale].archetypesClient[archetypeId]?.nom;
    if (trad) return trad;
  }
  return fallbackFr;
}

/** Nom localisé d'un archétype de vendeur (chine). Remplace les lectures directes de `NOM_ARCHETYPE`. */
export function nomArchetypeVendeur(archetype: string, locale: Locale): string {
  if (locale !== "fr") {
    const trad =
      PERSONNAGES_OVERLAY[locale].archetypesVendeur[
        archetype as VendeurArchetypeId
      ];
    if (trad) return trad;
  }
  return NOM_ARCHETYPE[archetype as VendeurArchetypeId] ?? archetype;
}

/**
 * Nom localisé d'un vendeur (chine). Remplace `getNomVendeur` en UI. Les 4
 * commanditaires suivent l'expéditeur (source unique) ; archétype inconnu →
 * `vendeurInconnu` localisé (« Un vendeur »/« A seller »/« Un vendedor »).
 */
export function nomVendeur(archetype: string, locale: Locale): string {
  const expId = VENDEUR_COMMANDITAIRE_EXP[archetype as VendeurArchetypeId];
  if (expId) return nomExpediteur(expId, locale);
  if (locale !== "fr") {
    const trad =
      PERSONNAGES_OVERLAY[locale].vendeurs[archetype as VendeurArchetypeId];
    if (trad) return trad;
    if (!(archetype in NOM_VENDEUR)) {
      return PERSONNAGES_OVERLAY[locale].vendeurInconnu;
    }
  }
  return getNomVendeur(archetype);
}

/** Nom localisé d'un expéditeur de courrier. Id absent de l'overlay → nom FR canonique. */
export function nomExpediteur(id: string, locale: Locale): string {
  if (locale !== "fr") {
    const trad = PERSONNAGES_OVERLAY[locale].expediteurs[id]?.nom;
    if (trad) return trad;
  }
  return EXPEDITEURS[id]?.nom ?? id;
}

/** Personnalité localisée d'un expéditeur. Id absent → personnalité FR canonique. */
export function personnaliteExpediteur(id: string, locale: Locale): string {
  if (locale !== "fr") {
    const trad = PERSONNAGES_OVERLAY[locale].expediteurs[id]?.personnalite;
    if (trad) return trad;
  }
  return EXPEDITEURS[id]?.personnalite ?? "";
}

/** Signature localisée d'un expéditeur (multi-lignes, `\n` conservés). Id absent → signature FR. */
export function signatureExpediteur(id: string, locale: Locale): string {
  if (locale !== "fr") {
    const trad = PERSONNAGES_OVERLAY[locale].expediteurs[id]?.signature;
    if (trad) return trad;
  }
  return EXPEDITEURS[id]?.signature ?? "";
}

/** Utils des tests de complétude par domaine. */
export function manquants<T>(ids: string[], overlay: Record<string, T>): string[] {
  return ids.filter((id) => !(id in overlay));
}
export function orphelins<T>(ids: string[], overlay: Record<string, T>): string[] {
  const connus = new Set(ids);
  return Object.keys(overlay).filter((k) => !connus.has(k));
}
