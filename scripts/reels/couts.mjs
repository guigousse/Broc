/** Estimation des coûts de génération. Module pur. */
import { DUREES, TARIFS } from "./config.mjs";

export function coutClip({ palier, definition, secondes = DUREES.plan }) {
  const grille = TARIFS[palier];
  if (!grille) {
    throw new Error(`palier « ${palier} » inconnu : attendu ${Object.keys(TARIFS).join(", ")}`);
  }
  const tarif = grille[definition];
  if (tarif === undefined) {
    throw new Error(
      `définition « ${definition} » inconnue pour le palier ${palier} : attendu ${Object.keys(grille).join(", ")}`,
    );
  }
  return tarif * secondes;
}

export function coutEpisode({ palier, definition, plans = DUREES.plans }) {
  return coutClip({ palier, definition }) * plans;
}

export function formaterDollars(montant) {
  return `${montant.toFixed(2).replace(".", ",")} $`;
}
