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

/**
 * Stock initial : 4 communs + 1 rare tirés au hasard parmi les templates
 * (toutes catégories confondues, tier 1 implicite via le pool commun).
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
