/**
 * Libellés et propriétés des objectifs de mission.
 * Fonctions déménagées depuis CommandeRow.tsx (qui va disparaître).
 * Partagées par la carte d'histoire et la ligne de quête.
 */

import { libelleEtat, libelleCategorie } from "@/lib/i18n/libelles";
import type { DictionnaireUI } from "@/lib/i18n/ui";
import type { ObjectifMission } from "@/types/game";

/** Libellé localisé d'un objectif de chapitre (hors cibles "objet", déjà
 *  rendues via `cibles`). `restauration` interpole l'état minimum requis. */
export function libelleObjectif(
  o: ObjectifMission,
  d: DictionnaireUI,
  tr: (gabarit: string, params?: Record<string, string | number>) => string,
): string {
  switch (o.type) {
    case "ventesCumulees":
      return d.carnet.objectifs.ventesCumulees;
    case "profitVente":
      return d.carnet.objectifs.profitVente;
    case "restauration":
      return tr(d.carnet.objectifs.restauration, { etat: libelleEtat(o.etatMin, d) });
    case "valeurCollection":
      return d.carnet.objectifs.valeurCollection;
    case "niveau":
      return d.carnet.objectifs.niveau;
    case "objet":
      return "";
    case "objetsRares":
      return d.carnet.objectifs.objetsRares;
    case "beneficeCumule":
      return d.carnet.objectifs.beneficeCumule;
    case "ventesCategorie":
      return tr(d.carnet.objectifs.ventesCategorie, { categorie: libelleCategorie(o.categorie, d) });
  }
}

/**
 * Un objectif se compte-t-il en euros ? La liste est EXPLICITE et non une
 * négation : « tout sauf niveau et restauration » avait fait afficher
 * « 3 / 5 € » pour un objectif qui compte des objets.
 *
 * Énumération type par type (les 9 membres de `ObjectifMission`) :
 *   - objet             → false (jamais rendu ici, passe par `cibles`)
 *   - ventesCumulees     → true  (montant en €)
 *   - profitVente        → true  (montant en €)
 *   - restauration       → false (état requis, pas un montant)
 *   - valeurCollection   → true  (montant en €)
 *   - niveau             → false (numéro de niveau)
 *   - objetsRares        → false (compte des objets)
 *   - beneficeCumule     → true  (montant en €)
 *   - ventesCategorie    → false (compte des objets)
 */
export function objectifEnEuros(type: ObjectifMission["type"]): boolean {
  return (
    type === "ventesCumulees" ||
    type === "profitVente" ||
    type === "valeurCollection" ||
    type === "beneficeCumule"
  );
}
