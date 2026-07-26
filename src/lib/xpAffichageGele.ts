"use client";

import { useSyncExternalStore } from "react";
import type { BrocanteurState } from "@/types/game";

/**
 * Gel d'affichage de la barre XP du header pendant une session.
 *
 * L'XP réelle continue d'être créditée immédiatement dans le GameContext
 * (rien n'est perdu si l'app est tuée en pleine session) ; seul l'affichage
 * du header est figé sur un instantané, pour que la barre ne progresse qu'au
 * moment de la cérémonie de bilan (envol de la pastille XP).
 *
 * Store de module plutôt que contexte : c'est une préoccupation purement
 * d'affichage, ça évite d'élargir le GameContext et d'ajouter un provider.
 */
let instantane: BrocanteurState | null = null;
const abonnes = new Set<() => void>();

function notifier(): void {
  for (const cb of abonnes) cb();
}

function souscrire(cb: () => void): () => void {
  abonnes.add(cb);
  return () => {
    abonnes.delete(cb);
  };
}

function lire(): BrocanteurState | null {
  return instantane;
}

/** Côté serveur, rien n'est jamais gelé (le gel naît d'une action joueur). */
function lireServeur(): BrocanteurState | null {
  return null;
}

/** Fige l'affichage de la barre XP sur cet instantané. Idempotent. */
export function gelerXpAffichage(valeur: BrocanteurState): void {
  instantane = valeur;
  notifier();
}

/** Rend la barre XP à sa valeur réelle. Sans effet si rien n'est gelé. */
export function degelerXpAffichage(): void {
  if (instantane === null) return;
  instantane = null;
  notifier();
}

/** Renvoie l'instantané tant que le gel dure, la valeur réelle sinon. */
export function useXpAffiche(reel: BrocanteurState): BrocanteurState {
  const gele = useSyncExternalStore(souscrire, lire, lireServeur);
  return gele ?? reel;
}
