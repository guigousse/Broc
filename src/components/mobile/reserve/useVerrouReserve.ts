"use client";

/**
 * Source unique du verrou et du badge de l'onglet Atelier.
 *
 * Les deux contenus de la Réserve montent la même bande d'onglets, donc les
 * mêmes trois décisions : l'Atelier est-il ouvert, combien de restaurations
 * sont prêtes, et que dit-on au joueur qui touche le cadenas. Recopiées de
 * part et d'autre, elles divergeraient un jour en silence — le badge ne
 * comptant plus la même chose selon l'onglet où l'on se trouve.
 */

import { useGameActions, useGameStateOnly } from "@/context/GameContext";
import { aCompetenceReparation } from "@/lib/competences";
import { estPret } from "@/lib/restauration";
import { useToast } from "@/components/ui/Toast";
import { useLangue } from "@/lib/i18n/LangueContext";

export interface VerrouReserve {
  /** Faux tant que le joueur n'a pas sa première compétence Réparer. */
  atelierOuvert: boolean;
  /** Restaurations prêtes à récupérer. */
  badgeAtelier: number;
  /** À appeler au tap sur l'onglet Atelier cadenassé. */
  onVerrou: () => void;
}

export function useVerrouReserve(): VerrouReserve {
  const { state } = useGameStateOnly();
  const { tempsConfiance } = useGameActions();
  const { toast } = useToast();
  const { d } = useLangue();

  // L'horloge de confiance (et non `Date.now()`) : c'est elle qui décide
  // qu'une restauration est prête partout ailleurs dans le jeu. Le repli sur
  // l'heure murale ne joue que le temps qu'elle s'établisse.
  const now = tempsConfiance() ?? Date.now();

  return {
    atelierOuvert: !!state && aCompetenceReparation(state),
    badgeAtelier:
      state?.inventaireJoueur.filter(
        (o) => o.enRestauration && estPret(o.enRestauration, now),
      ).length ?? 0,
    onVerrou: () => toast(d.chrome.verrouAtelier, { type: "info" }),
  };
}
