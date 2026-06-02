export interface ExpediteurDef {
  id: string;
  /** Nom affiché dans la signature et le badge. */
  nom: string;
  /** Lien avec le joueur (« Mère », « Ami d'enfance », « Maire »…). */
  relation: string;
  /** Formule de fin de lettre (multi-ligne ok). */
  signature: string;
}

export const EXPEDITEURS: Record<string, ExpediteurDef> = {
  maman: {
    id: "maman",
    nom: "Maman",
    relation: "Mère",
    signature: "Avec tout mon amour,\nMaman",
  },
};

export function getExpediteur(id: string): ExpediteurDef | null {
  return EXPEDITEURS[id] ?? null;
}
