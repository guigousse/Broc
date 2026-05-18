import type {
  CategorieObjet,
  CatalogueEntree,
  GameState,
} from "@/types/game";
import { CATEGORIES } from "@/data/categories";
import { OBJET_TEMPLATES, LEGENDAIRES } from "@/data/objetTemplates";

/**
 * Construit un catalogue initial (toutes entrées non vues, possede=0) à partir
 * du pool complet de templates. Une catégorie = un tableau d'entrées triées
 * par rareté puis par nom.
 */
export function initCatalogue(): Record<CategorieObjet, CatalogueEntree[]> {
  const POOL_COMPLET = [...OBJET_TEMPLATES, ...LEGENDAIRES];
  const ordre = { commun: 0, rare: 1, legendaire: 2 } as const;
  const cat: Record<CategorieObjet, CatalogueEntree[]> = {} as Record<
    CategorieObjet,
    CatalogueEntree[]
  >;
  for (const c of CATEGORIES) cat[c] = [];
  for (const t of POOL_COMPLET) {
    cat[t.categorie].push({
      templateId: t.templateId,
      nom: t.nom,
      categorie: t.categorie,
      rarete: t.rarete,
      vu: false,
      possede: 0,
      unique: t.unique,
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

/** Marque une entrée comme vue. Retourne un nouveau catalogue (immutable). */
export function marquerVuTemplate(
  catalogue: Record<CategorieObjet, CatalogueEntree[]>,
  templateId: string,
): Record<CategorieObjet, CatalogueEntree[]> {
  const next = { ...catalogue };
  for (const cat of Object.keys(next) as CategorieObjet[]) {
    const entrees = next[cat];
    const idx = entrees.findIndex((e) => e.templateId === templateId);
    if (idx >= 0 && !entrees[idx].vu) {
      next[cat] = [
        ...entrees.slice(0, idx),
        { ...entrees[idx], vu: true },
        ...entrees.slice(idx + 1),
      ];
      return next;
    }
  }
  return catalogue;
}

/** Incrémente le compteur di possessions (et marque vu). */
export function marquerDejaPossedeTemplate(
  catalogue: Record<CategorieObjet, CatalogueEntree[]>,
  templateId: string,
): Record<CategorieObjet, CatalogueEntree[]> {
  const next = { ...catalogue };
  for (const cat of Object.keys(next) as CategorieObjet[]) {
    const entrees = next[cat];
    const idx = entrees.findIndex((e) => e.templateId === templateId);
    if (idx >= 0) {
      const e = entrees[idx];
      next[cat] = [
        ...entrees.slice(0, idx),
        { ...e, vu: true, possede: e.possede + 1 },
        ...entrees.slice(idx + 1),
      ];
      return next;
    }
  }
  return catalogue;
}

export interface ProgressionCategorie {
  categorie: CategorieObjet;
  total: number;
  vues: number;
  possedees: number;
}

export function progressionCategorie(
  catalogue: Record<CategorieObjet, CatalogueEntree[]>,
  cat: CategorieObjet,
): ProgressionCategorie {
  const entrees = catalogue[cat] ?? [];
  return {
    categorie: cat,
    total: entrees.length,
    vues: entrees.filter((e) => e.vu).length,
    possedees: entrees.filter((e) => e.possede > 0).length,
  };
}

export function progressionGlobale(
  catalogue: Record<CategorieObjet, CatalogueEntree[]>,
): { total: number; vues: number; possedees: number } {
  let total = 0;
  let vues = 0;
  let possedees = 0;
  for (const c of CATEGORIES) {
    const p = progressionCategorie(catalogue, c);
    total += p.total;
    vues += p.vues;
    possedees += p.possedees;
  }
  return { total, vues, possedees };
}

/** True si toutes les entrées du catalogue sont possédées au moins une fois. */
export function catalogueComplete(
  catalogue: Record<CategorieObjet, CatalogueEntree[]>,
): boolean {
  const p = progressionGlobale(catalogue);
  return p.possedees === p.total;
}
