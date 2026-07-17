import type { Locale } from "@/lib/i18n/locales";
import type { CleMessageNego, MessageNego, VendeurArchetypeId } from "@/types/game";
import { tr } from "@/lib/i18n/ui";
import { POOLS_NEGO_FR } from "@/lib/negociation";
import { NEGO_EN } from "./en/nego";
import { NEGO_ES } from "./es/nego";
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
import { DIVERS_EN } from "./en/divers";
import { DIVERS_ES } from "./es/divers";
import { COURRIER_EN } from "./en/courrier";
import { COURRIER_ES } from "./es/courrier";
import { QUETES_GABARITS_EN } from "./en/quetesGabarits";
import { QUETES_GABARITS_ES } from "./es/quetesGabarits";
import type { DialogueSequence } from "@/data/dialogues";
import { DIALOGUES_EN } from "./en/dialogues";
import { DIALOGUES_ES } from "./es/dialogues";
import { libelleEtat } from "@/lib/i18n/libelles";
import { DICTIONNAIRES } from "@/lib/i18n/ui";
import type { EtatObjet, MissionCible } from "@/types/game";

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

/* ------------------------------------------------------------------ */
/* Petits domaines : camions, paliers de stockage, célébrités          */
/* ------------------------------------------------------------------ */

const DIVERS_OVERLAY: Record<
  "en" | "es",
  { camions: Record<string, string>; stockage: Record<string, string>; celebrites: Record<string, string> }
> = {
  en: DIVERS_EN,
  es: DIVERS_ES,
};

/** Nom localisé d'un camion. Clé = `visuelId` ; `visuelId` absent → nom FR passé en argument. */
export function nomCamion(c: { visuelId: string; nom: string }, locale: Locale): string {
  if (locale !== "fr") {
    const trad = DIVERS_OVERLAY[locale].camions[c.visuelId];
    if (trad) return trad;
  }
  return c.nom;
}

/** Nom localisé d'un palier de stockage. Clé = niveau en chaîne ; niveau absent → nom FR passé. */
export function nomStockageTier(t: { niveau: 1 | 2 | 3; nom: string }, locale: Locale): string {
  if (locale !== "fr") {
    const trad = DIVERS_OVERLAY[locale].stockage[String(t.niveau)];
    if (trad) return trad;
  }
  return t.nom;
}

/**
 * Nom localisé d'une célébrité. Clé = chaîne FR canonique (persistée dans
 * `CelebriteEvenement.nom`) ; chaîne absente de l'overlay → chaîne passée telle
 * quelle (couvre les vieilles saves et tout ajout futur non traduit).
 */
export function nomCelebrite(nomFr: string, locale: Locale): string {
  if (locale !== "fr") {
    const trad = DIVERS_OVERLAY[locale].celebrites[nomFr];
    if (trad) return trad;
  }
  return nomFr;
}

/* ------------------------------------------------------------------ */
/* Dialogues tutoriel + ambiance (séquences stables)                   */
/* ------------------------------------------------------------------ */

const DIALOGUES_OVERLAY: Record<"en" | "es", Record<string, string[]>> = {
  en: DIALOGUES_EN,
  es: DIALOGUES_ES,
};

/** Lignes d'une séquence de dialogue dans la locale demandée (repli FR). */
export function lignesDialogue(
  seq: DialogueSequence,
  locale: Locale,
): string[] {
  if (locale !== "fr") {
    const trad = DIALOGUES_OVERLAY[locale][seq.id];
    if (trad && trad.length === seq.lignes.length) return trad;
  }
  return seq.lignes.map((l) => l.texte);
}

/* ------------------------------------------------------------------ */
/* Courrier scénarisé : lettre de Maman + arc principal (par id stable)  */
/* ------------------------------------------------------------------ */

const COURRIER_OVERLAY: Record<
  "en" | "es",
  Record<string, { titre: string; corps: string[] }>
> = {
  en: COURRIER_EN,
  es: COURRIER_ES,
};

/* --- Quêtes périodiques : régénération par gabarit persisté (SP4) --- */

const QUETES_GABARITS_OVERLAY: Record<
  "en" | "es",
  Record<string, { titre: string; corps: string[] }>
> = {
  en: QUETES_GABARITS_EN,
  es: QUETES_GABARITS_ES,
};

/**
 * Mise en forme des placeholders `{objets}`/`{etat}` PROPRE À CHAQUE LANGUE
 * (guillemets, séparateurs, mention d'état) — pas un calque du FR. Le FR reste
 * dans `quetes/textes.ts` ; ici on ne traite que les locales à régénérer.
 */
const MISE_EN_FORME_GABARIT: Record<
  "en" | "es",
  {
    objets: (cibles: MissionCible[], locale: "en" | "es") => string;
    etat: (etatMin: EtatObjet | undefined, locale: "en" | "es") => string;
  }
> = {
  en: {
    objets: (cibles, locale) =>
      cibles.map((c) => `"${nomTemplate(c.templateId, locale)}"`).join(", "),
    etat: (etatMin, locale) =>
      etatMin ? ` (min. condition: ${libelleEtat(etatMin, DICTIONNAIRES[locale])})` : "",
  },
  es: {
    objets: (cibles, locale) =>
      cibles.map((c) => `« ${nomTemplate(c.templateId, locale)} »`).join(", "),
    etat: (etatMin, locale) =>
      etatMin ? ` (estado mín.: ${libelleEtat(etatMin, DICTIONNAIRES[locale])})` : "",
  },
};

/** Payload d'un courrier tel que consommé par la régénération de gabarit. */
type PayloadCourrier = {
  titre: string;
  corps: string[];
  gabaritId?: string;
  gabaritParams?: { etatMin?: EtatObjet };
  cibles?: MissionCible[];
};

/**
 * Cœur de régénération d'un texte de gabarit périodique dans la locale (≠ fr) :
 * résout la variante par `gabaritId` (absorbe un index hors borne via
 * `index % nbVariantes`) puis interpole `{objets}`/`{etat}`. `null` si pas de
 * gabarit résoluble. Partagé par la voie payload (`resoudreGabarit`) et la voie
 * ledger (`titreDepuisGabarit`, après purge du courrier).
 */
function resoudreGabaritCore(
  gabaritId: string | undefined,
  cibles: MissionCible[],
  etatMin: EtatObjet | undefined,
  locale: "en" | "es",
): { titre: string; corps: string[] } | null {
  if (!gabaritId) return null;
  const sep = gabaritId.lastIndexOf("#");
  if (sep < 0) return null;
  const cle = gabaritId.slice(0, sep);
  const idx = Number.parseInt(gabaritId.slice(sep + 1), 10);
  if (!Number.isFinite(idx)) return null;

  const overlay = QUETES_GABARITS_OVERLAY[locale];
  const variantes = Object.keys(overlay).filter((k) => k.startsWith(`${cle}#`));
  if (variantes.length === 0) return null;
  const cleReelle = `${cle}#${((idx % variantes.length) + variantes.length) % variantes.length}`;
  const g = overlay[cleReelle];
  if (!g) return null;

  const fmt = MISE_EN_FORME_GABARIT[locale];
  const objets = fmt.objets(cibles, locale);
  const etat = fmt.etat(etatMin, locale);
  const fill = (s: string) =>
    s.replaceAll("{objets}", objets).replaceAll("{etat}", etat);
  return { titre: fill(g.titre), corps: g.corps.map(fill) };
}

/**
 * Régénère titre+corps d'un courrier périodique depuis son payload. Repli `null`
 * sur la voie id stable puis payload FR.
 */
function resoudreGabarit(
  payload: PayloadCourrier,
  locale: "en" | "es",
): { titre: string; corps: string[] } | null {
  return resoudreGabaritCore(
    payload.gabaritId,
    payload.cibles ?? [],
    payload.gabaritParams?.etatMin,
    locale,
  );
}

/**
 * Titre localisé d'une récompense de mission régénéré SANS le courrier (purgé
 * par les lots périodiques) : le grand livre persiste `gabaritId`/`templateIds`/
 * `etatMin` dans `LedgerParams`. `null` si locale fr (→ designation FR canonique)
 * ou gabarit non résoluble. Réutilise `resoudreGabaritCore` (pas de duplication).
 */
export function titreDepuisGabarit(
  gabaritId: string | undefined,
  templateIds: string[] | undefined,
  etatMin: EtatObjet | undefined,
  locale: Locale,
): string | null {
  if (locale === "fr") return null;
  const cibles: MissionCible[] = (templateIds ?? []).map((id) => ({ templateId: id }));
  const regen = resoudreGabaritCore(gabaritId, cibles, etatMin, locale);
  return regen ? regen.titre : null;
}

/**
 * Titre localisé d'un courrier. Priorité : (1) régénération par gabarit persisté
 * (quêtes périodiques) → (2) overlay par `c.id` (arc/lettre scénarisée, Task 4)
 * → (3) titre FR du payload (vieilles saves, FR). Jamais d'écriture en save.
 */
export function titreCourrier(
  c: { id: string; payload: PayloadCourrier },
  locale: Locale,
): string {
  if (locale !== "fr") {
    const regen = resoudreGabarit(c.payload, locale);
    if (regen) return regen.titre;
    const trad = COURRIER_OVERLAY[locale][c.id]?.titre;
    if (trad) return trad;
  }
  return c.payload.titre;
}

/**
 * Corps localisé d'un courrier. Même priorité que `titreCourrier` : gabarit
 * régénéré → overlay par id (mêmes paragraphes que le FR) → corps FR du payload.
 */
export function corpsCourrier(
  c: { id: string; payload: PayloadCourrier },
  locale: Locale,
): string[] {
  if (locale !== "fr") {
    const regen = resoudreGabarit(c.payload, locale);
    if (regen) return regen.corps;
    const trad = COURRIER_OVERLAY[locale][c.id]?.corps;
    if (trad) return trad;
  }
  return c.payload.corps;
}

/* ------------------------------------------------------------------ */
/* Négociation : répliques structurées (MessageNego) → texte localisé   */
/* ------------------------------------------------------------------ */

/** Pools de répliques par langue. FR = `POOLS_NEGO_FR` (source), EN/ES overlays. */
const POOLS_NEGO: Record<Locale, Record<CleMessageNego, string[]>> = {
  fr: POOLS_NEGO_FR,
  en: NEGO_EN,
  es: NEGO_ES,
};

/**
 * Résout un `MessageNego` en texte affichable dans la langue demandée :
 * lookup du pool par locale + clé, modulo sur la variante (les pools peuvent
 * avoir des tailles différentes selon la langue), puis interpolation des
 * `params` via `tr()`. Aucune écriture en save — appelé uniquement à l'affichage.
 */
export function texteNego(msg: MessageNego, locale: Locale): string {
  const pool = POOLS_NEGO[locale][msg.cle];
  const gabarit = pool[msg.variante % pool.length];
  return tr(gabarit, msg.params);
}

/** Utils des tests de complétude par domaine. */
export function manquants<T>(ids: string[], overlay: Record<string, T>): string[] {
  return ids.filter((id) => !(id in overlay));
}
export function orphelins<T>(ids: string[], overlay: Record<string, T>): string[] {
  const connus = new Set(ids);
  return Object.keys(overlay).filter((k) => !connus.has(k));
}
