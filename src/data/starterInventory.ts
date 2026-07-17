import type { EtatObjet, Objet } from "@/types/game";
import { OBJET_TEMPLATES, type ObjetTemplate } from "@/data/objetTemplates";

const ETATS_STARTER: readonly EtatObjet[] = ["Mauvais", "Bon", "Très bon"];
const FACTEUR_ETAT: Record<EtatObjet, number> = {
  Mauvais: 0.3,
  Bon: 0.6,
  "Très bon": 1,
  "Pristin état": 1.4,
};

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function instancier(template: ObjetTemplate): Objet {
  const etat = pickRandom(ETATS_STARTER);
  return {
    id: crypto.randomUUID(),
    templateId: template.templateId,
    nom: template.nom,
    categorie: template.categorie,
    rarete: template.rarete,
    etat,
    prixReferenceReel: Math.max(
      1,
      Math.round(template.prixRefBase * FACTEUR_ETAT[etat]),
    ),
  };
}

/** Taille du colis du tutoriel (= le stock initial historique). */
export const COLIS_TUTORIEL_TAILLE = 5;

/**
 * i-ème objet du colis du tutoriel (0-based) : mêmes tirages que le stock
 * initial historique — 4 communs puis 1 rare, le rare en DERNIER (final de
 * cérémonie). Évite les doublons avec les templates déjà possédés quand le
 * pool le permet.
 */
export function objetColisTutoriel(
  index: number,
  templateIdsPossedes: readonly string[] = [],
): Objet {
  const rarete = index >= COLIS_TUTORIEL_TAILLE - 1 ? "rare" : "commun";
  const pool = OBJET_TEMPLATES.filter((t) => t.rarete === rarete);
  const possedes = new Set(templateIdsPossedes);
  const dispo = pool.filter((t) => !possedes.has(t.templateId));
  return instancier(pickRandom(dispo.length > 0 ? dispo : pool));
}

/**
 * Stock initial : 4 communs + 1 rare tirés au hasard parmi les templates
 * (toutes catégories confondues, tier 1 implicite via le pool commun).
 * Depuis le colis du tutoriel, les nouvelles parties ne l'appellent plus à
 * la création — les objets arrivent par `objetColisTutoriel` (colis ou
 * « Passer le tutoriel »).
 */
export function createStarterInventory(): Objet[] {
  const COMMUNS_POOL = OBJET_TEMPLATES.filter((t) => t.rarete === "commun");
  const RARES_POOL = OBJET_TEMPLATES.filter((t) => t.rarete === "rare");

  const tirer = (pool: ObjetTemplate[], n: number): ObjetTemplate[] => {
    const copy = [...pool];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
  };

  const choisis: ObjetTemplate[] = [
    ...tirer(COMMUNS_POOL, 4),
    ...tirer(RARES_POOL, 1),
  ];

  return choisis.map(instancier);
}
