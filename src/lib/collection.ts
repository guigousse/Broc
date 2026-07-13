import type {
  CategorieObjet,
  CollectionSlot,
  EtatObjet,
} from "@/types/game";
import { CATEGORIES } from "@/data/categories";
import { OBJET_TEMPLATES, LEGENDAIRES } from "@/data/objetTemplates";
import { UNIQUES } from "@/data/uniques";

/**
 * Construit une collection initiale (slots vides : vu=false, dejaPossede=false, donation=null)
 * à partir du pool complet (templates communs + rares + légendaires + uniques).
 * Triée par rareté puis par nom dans chaque catégorie.
 */
export function initCollection(): Record<CategorieObjet, CollectionSlot[]> {
  const POOL_COMPLET = [...OBJET_TEMPLATES, ...LEGENDAIRES, ...UNIQUES];
  const ordre = { commun: 0, rare: 1, legendaire: 2 } as const;
  const cat: Record<CategorieObjet, CollectionSlot[]> = {} as Record<
    CategorieObjet,
    CollectionSlot[]
  >;
  for (const c of CATEGORIES) cat[c] = [];
  for (const t of POOL_COMPLET) {
    cat[t.categorie].push({
      templateId: t.templateId,
      nom: t.nom,
      categorie: t.categorie,
      rarete: t.rarete,
      vu: false,
      dejaPossede: false,
      donation: null,
      unique: t.unique,
      vuDansCollection: true,
    });
  }
  for (const c of CATEGORIES) {
    cat[c].sort((a, b) => {
      const da = ordre[a.rarete] - ordre[b.rarete];
      if (da !== 0) return da;
      return a.nom.localeCompare(b.nom, "fr");
    });
  }
  return cat;
}

function modifierSlot(
  collection: Record<CategorieObjet, CollectionSlot[]>,
  templateId: string,
  patch: (s: CollectionSlot) => CollectionSlot,
): Record<CategorieObjet, CollectionSlot[]> {
  const next = { ...collection };
  for (const cat of Object.keys(next) as CategorieObjet[]) {
    const slots = next[cat];
    const idx = slots.findIndex((e) => e.templateId === templateId);
    if (idx >= 0) {
      const updated = patch(slots[idx]);
      if (updated === slots[idx]) return collection;
      next[cat] = [...slots.slice(0, idx), updated, ...slots.slice(idx + 1)];
      return next;
    }
  }
  return collection;
}

/** Marque un slot comme vu (croisé). Réinitialise le badge "nouveau" (vuDansCollection=false). */
export function marquerVu(
  collection: Record<CategorieObjet, CollectionSlot[]>,
  templateId: string,
): Record<CategorieObjet, CollectionSlot[]> {
  return modifierSlot(collection, templateId, (s) =>
    s.vu ? s : { ...s, vu: true, vuDansCollection: false },
  );
}

/** Marque un slot comme déjà possédé (et vu). */
export function marquerDejaPossede(
  collection: Record<CategorieObjet, CollectionSlot[]>,
  templateId: string,
): Record<CategorieObjet, CollectionSlot[]> {
  return modifierSlot(collection, templateId, (s) => {
    const transitionVu = !s.vu;
    if (s.dejaPossede && s.vu) return s;
    return {
      ...s,
      vu: true,
      dejaPossede: true,
      vuDansCollection: transitionVu ? false : s.vuDansCollection,
    };
  });
}

/** Marque un slot comme consulté dans la page collection (efface le badge "nouveau"). */
export function marquerVuDansCollection(
  collection: Record<CategorieObjet, CollectionSlot[]>,
  templateId: string,
): Record<CategorieObjet, CollectionSlot[]> {
  return modifierSlot(collection, templateId, (s) =>
    s.vuDansCollection ? s : { ...s, vuDansCollection: true },
  );
}

export interface ResultatDonation {
  collection: Record<CategorieObjet, CollectionSlot[]>;
  /** Si le slot était déjà rempli, l'ancienne donation déplacée (à recréer dans l'inventaire par le caller). */
  ancienne: { etat: EtatObjet; valeur: number; valeurBase?: number } | null;
}

/**
 * Prime appliquée à la valeur de collection d'une donation selon l'état de la
 * pièce. Récompense le passage par l'atelier : une pièce restaurée "muséale"
 * compte plus que sa simple valeur marchande.
 */
export const PRIME_DONATION_ETAT: Record<EtatObjet, number> = {
  Mauvais: 1,
  Bon: 1,
  "Très bon": 1.1,
  "Pristin état": 1.25,
};

/** Valeur de collection d'une donation : prix de référence × prime d'état. */
export function valeurDonation(etat: EtatObjet, prixReference: number): number {
  return Math.round(prixReference * PRIME_DONATION_ETAT[etat]);
}

/**
 * Pose une donation dans le slot du `templateId`. Si le slot était déjà rempli,
 * l'ancienne donation est retournée pour que le caller puisse la remettre en inventaire.
 * `valeur` est calculée avec la prime d'état ; `prixReference` brut est conservé
 * dans `valeurBase` pour recréer l'objet sans inflation si on le retire.
 */
export function donnerObjet(
  collection: Record<CategorieObjet, CollectionSlot[]>,
  templateId: string,
  etat: EtatObjet,
  prixReference: number,
): ResultatDonation {
  let ancienne: ResultatDonation["ancienne"] = null;
  const next = modifierSlot(collection, templateId, (s) => {
    ancienne = s.donation;
    return {
      ...s,
      vu: true,
      dejaPossede: true,
      donation: {
        etat,
        valeur: valeurDonation(etat, prixReference),
        valeurBase: prixReference,
      },
    };
  });
  return { collection: next, ancienne };
}

/**
 * Retire la donation du slot. Retourne aussi l'ancienne donation pour
 * que le caller puisse recréer l'objet dans l'inventaire.
 */
export function retirerDonation(
  collection: Record<CategorieObjet, CollectionSlot[]>,
  templateId: string,
): ResultatDonation {
  let ancienne: ResultatDonation["ancienne"] = null;
  const next = modifierSlot(collection, templateId, (s) => {
    if (!s.donation) return s;
    ancienne = s.donation;
    return { ...s, donation: null };
  });
  return { collection: next, ancienne };
}

/** Somme des valeurs des donations sur toute la collection. */
export function valeurTotale(
  collection: Record<CategorieObjet, CollectionSlot[]>,
): number {
  let total = 0;
  for (const c of CATEGORIES) {
    for (const s of collection[c] ?? []) {
      if (s.donation) total += s.donation.valeur;
    }
  }
  return total;
}

/** Somme des valeurs pour une catégorie donnée. */
export function valeurParCategorie(
  collection: Record<CategorieObjet, CollectionSlot[]>,
  cat: CategorieObjet,
): number {
  let total = 0;
  for (const s of collection[cat] ?? []) {
    if (s.donation) total += s.donation.valeur;
  }
  return total;
}

export interface ProgressionCategorie {
  categorie: CategorieObjet;
  total: number;
  vues: number;
  donnees: number;
  valeur: number;
}

export function progressionCategorie(
  collection: Record<CategorieObjet, CollectionSlot[]>,
  cat: CategorieObjet,
): ProgressionCategorie {
  const slots = collection[cat] ?? [];
  return {
    categorie: cat,
    total: slots.length,
    vues: slots.filter((s) => s.vu).length,
    donnees: slots.filter((s) => s.donation !== null).length,
    valeur: valeurParCategorie(collection, cat),
  };
}

export function progressionGlobale(
  collection: Record<CategorieObjet, CollectionSlot[]>,
): { total: number; vues: number; donnees: number; valeur: number } {
  let total = 0;
  let vues = 0;
  let donnees = 0;
  let valeur = 0;
  for (const c of CATEGORIES) {
    const p = progressionCategorie(collection, c);
    total += p.total;
    vues += p.vues;
    donnees += p.donnees;
    valeur += p.valeur;
  }
  return { total, vues, donnees, valeur };
}

/** Vrai si tous les slots de la collection ont une donation. */
export function collectionComplete(
  collection: Record<CategorieObjet, CollectionSlot[]>,
): boolean {
  const p = progressionGlobale(collection);
  return p.donnees === p.total && p.total > 0;
}

/**
 * Vrai si le template a déjà été possédé au moins une fois (achat,
 * restauration…), même revendu depuis. Pilote le badge collection ✓ du chinage.
 */
export function templateDejaPossede(
  collection: Record<CategorieObjet, CollectionSlot[]>,
  templateId: string,
): boolean {
  return Object.values(collection).some((slots) =>
    slots.some((s) => s.templateId === templateId && s.dejaPossede),
  );
}
