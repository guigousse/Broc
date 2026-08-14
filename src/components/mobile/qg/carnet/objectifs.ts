/**
 * Libellés et propriétés des objectifs de mission.
 * Fonctions déménagées depuis CommandeRow.tsx (qui va disparaître).
 * Partagées par la carte d'histoire et la ligne de quête.
 */

import { Coins, Gem, Package, TrendingUp, type LucideIcon } from "lucide-react";
import { libelleEtat, libelleCategorie } from "@/lib/i18n/libelles";
import type { DictionnaireUI } from "@/lib/i18n/ui";
import { objectifsDeMission, progressionObjectif } from "@/lib/quetes/objectifs";
import { ICONE_FORME, formeDepuisObjectif } from "@/lib/quetes/formes";
import type { Courrier, CourrierPayloadMission, GameState, MissionResolution, ObjectifMission } from "@/types/game";

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

/** Composants Lucide indexés par leur PROPRE nom — le seul pont dont on a
 *  besoin entre `ICONE_FORME` (qui donne des noms de chaînes, source de
 *  vérité côté `lib/quetes`) et les composants réels. */
const ICONES_LUCIDE: Record<string, LucideIcon> = { Gem, TrendingUp, Coins, Package };

/** Bloc de progression affiché par une carte de quête (chapitre ou ligne
 *  périodique) : barre, compteur, icône du visuel de gauche, état du pavé de
 *  récompense. */
export interface ProgressionAffichee {
  /** Largeur de la barre, 0-100. */
  pct: number;
  /** Texte du compteur : "3/5" (agrégat) ou "120 / 300 €" (objectif chiffré unique). */
  compteur: string;
  /** Objectif chiffré unique (aucune cible objet, un seul objectif non-objet), sinon `null`. */
  objectifChiffre: ObjectifMission | null;
  /** Premier objectif non-"objet" de la mission, sinon `null` (mission à cibles pures). */
  premierObjectifNonObjet: ObjectifMission | null;
  /** Icône Lucide déjà résolue pour le visuel de gauche sans cible objet ; `null` si la
   *  mission a des cibles (photo de l'objet) ou si le premier objectif n'a pas de forme. */
  IconeForme: LucideIcon | null;
  /** Pastille ✓ sur le visuel de gauche : accompli, ou le seul objectif chiffré déjà atteint. */
  iconeAccompli: boolean;
  /** Le pavé de récompense doit-il s'allumer (bandeau prêt à livrer) ? */
  bandeauPret: boolean;
  /** Le pavé doit-il refuser le tap (déjà en cérémonie, ou cérémonie d'une autre quête) ? */
  paveVerrouille: boolean;
}

/**
 * Dérive tout le bloc de progression d'une mission — la MÊME question posée
 * par `LigneQuete` (quête périodique) et `CarteHistoire` (chapitre courant) :
 * où en est cette quête, et que doit afficher son compteur ? Centralisé ici
 * pour qu'un correctif de calcul (ex. garde 0/0, arrondi, garde `accompli`)
 * profite aux deux cartes d'un coup — la dérive entre deux copies inline a
 * été le sujet d'une revue de code (chaque carte avait le même calcul
 * recopié verbatim, y compris les commentaires).
 *
 * `accompli` doit valoir `enCeremonie` côté appelant : le state est déjà
 * post-livraison pendant la cérémonie (objets consommés, mission "livree"),
 * donc tous les calculs ci-dessous retomberaient à zéro pile au moment du
 * payoff sans ce garde-fou explicite.
 */
export function progressionAffichee(
  p: CourrierPayloadMission,
  courrier: Pick<Courrier, "id" | "jourRecu">,
  state: GameState,
  reso: MissionResolution | undefined,
  accompli: boolean,
  livrable: boolean,
  livrerVerrouille: boolean,
): ProgressionAffichee {
  const resoPourObjectifs: MissionResolution = reso ?? { courrierId: courrier.id, statut: "active" };
  // Progression agrégée sur TOUS les objectifs (cibles objets + objectifs non-objet),
  // pas seulement les cibles objets : pour les quêtes sans cible (ex. beneficeCumule),
  // se limiter aux cibles donnerait un faux "0/0" / une barre à largeur NaN%.
  const objectifsTous = objectifsDeMission(p);
  const totalObjectifs = objectifsTous.length;
  const rempliesObjectifs = objectifsTous.filter(
    (o) => progressionObjectif(o, state, resoPourObjectifs, courrier.jourRecu).atteint,
  ).length;
  const premierObjectifNonObjet = objectifsTous.find((o) => o.type !== "objet") ?? null;
  const progPremierObjectif = premierObjectifNonObjet
    ? progressionObjectif(premierObjectifNonObjet, state, resoPourObjectifs, courrier.jourRecu)
    : null;
  // Progression affichée : objectif chiffré unique (aucune cible objet, un seul
  // objectif non-objet) → "actuel / cible €" fin-grain ; sinon agrégat
  // "remplies / total" (garde-fous 0/0-NaN communs aux deux branches).
  const objectifChiffre =
    p.cibles.length === 0 && objectifsTous.length === 1 ? premierObjectifNonObjet : null;
  const pct = accompli
    ? 100
    : objectifChiffre && progPremierObjectif
    ? Math.min(100, (progPremierObjectif.actuel / Math.max(1, progPremierObjectif.cible)) * 100)
    : totalObjectifs > 0 ? (rempliesObjectifs / totalObjectifs) * 100 : 0;
  const compteur = objectifChiffre && progPremierObjectif
    ? `${accompli ? progPremierObjectif.cible : progPremierObjectif.actuel} / ${progPremierObjectif.cible}${objectifEnEuros(objectifChiffre.type) ? " €" : ""}`
    : `${accompli ? totalObjectifs : rempliesObjectifs}/${totalObjectifs}`;

  const forme = premierObjectifNonObjet ? formeDepuisObjectif(premierObjectifNonObjet.type) : null;
  const nomIconeForme = forme ? ICONE_FORME[forme] : null;
  const IconeForme = nomIconeForme ? ICONES_LUCIDE[nomIconeForme] : null;
  const iconeAccompli = accompli || (progPremierObjectif?.atteint ?? false);

  return {
    pct,
    compteur,
    objectifChiffre,
    premierObjectifNonObjet,
    IconeForme,
    iconeAccompli,
    bandeauPret: livrable || accompli,
    paveVerrouille: accompli || livrerVerrouille,
  };
}
