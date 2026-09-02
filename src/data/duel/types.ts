import type { CategorieObjet } from "@/types/game";

export type Cout = 1 | 2 | 3 | 4 | 5;

/** Mots-clés des communes (liste fermée, spec §4.2). */
export type MotCle =
  | { type: "barrage" }
  | { type: "prompt" }
  | { type: "solide" }
  | { type: "fragile" }
  | { type: "ruse" }
  | { type: "cri"; variante: "pioche" | "degat" | "soin" };

/** Les mots-clés qui restent sur l'objet une fois posé (Cri est instantané). */
export type MotCleActif = "barrage" | "prompt" | "solide" | "fragile" | "ruse";

export type Declencheur = "pose" | "casse" | "debutTour" | "attaque" | "blesse";

export type Action =
  | { type: "degats"; cible: "objetAdverse" | "tousObjetsAdverses" | "vitrineAdverse"; valeur: number }
  | { type: "soinVitrine"; valeur: number }
  | { type: "pioche"; valeur: number }
  | { type: "energie"; valeur: number }
  | {
      type: "gain";
      stat: "attaque" | "pv";
      cible: "soi" | "allies" | "alliesCategorie";
      categorie?: CategorieObjet;
      valeur: number;
    }
  | { type: "retourEnMain" }
  | { type: "volMotCle" };

export interface Effet {
  type: "effet";
  declencheur: Declencheur;
  /** 1 action pour une rare, 1 ou 2 pour une légendaire. */
  actions: Action[];
  /** Prix retiré du budget de stats (1..3 rare, ≤ 4 légendaire). Retouché par la campagne. */
  prix: number;
}

export type TexteDuel = MotCle | Effet;

export interface StatsDuel {
  cout: Cout;
  attaque: number;
  pv: number;
  texte?: TexteDuel;
}

/** Les actions qui exigent un choix de cible (autorisées avec `pose` seulement). */
export function actionAChoix(a: Action): boolean {
  return (a.type === "degats" && a.cible === "objetAdverse") || a.type === "retourEnMain" || a.type === "volMotCle";
}
