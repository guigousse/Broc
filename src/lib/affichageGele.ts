"use client";

import { useSyncExternalStore } from "react";
import type { BrocanteurState } from "@/types/game";

/**
 * Gel d'affichage des compteurs du header pendant une session : la barre XP
 * (chinage et vente) et la caisse (vente).
 *
 * L'XP et l'argent réels continuent d'être crédités immédiatement dans le
 * GameContext — rien n'est perdu si l'app est tuée en pleine session. Seul
 * l'affichage du header est figé, pour que les compteurs ne bougent qu'au
 * moment de la cérémonie de bilan, quand chaque gain vient s'y poser.
 *
 * Store de module plutôt que contexte : c'est une préoccupation purement
 * d'affichage, ça évite d'élargir le GameContext et d'ajouter un provider.
 */
let instantane: BrocanteurState | null = null;
/** Caisse figée à l'entrée en session, et supplément déjà encaissé au bilan. */
let budgetGele: number | null = null;
let supplementBudget = 0;
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

function lireBudget(): number | null {
  return budgetGele === null ? null : budgetGele + supplementBudget;
}

function lireBudgetServeur(): number | null {
  return null;
}

/** Fige la caisse affichée sur ce montant, supplément remis à zéro. Idempotent. */
export function gelerBudgetAffichage(montant: number): void {
  budgetGele = montant;
  supplementBudget = 0;
  notifier();
}

/**
 * Montant déjà encaissé pendant la cérémonie, en ABSOLU (cumul depuis le début
 * du bilan) et non en delta : rejouer la même étape, ou sauter d'un coup à la
 * fin, ne peut donc pas compter deux fois le même objet.
 */
export function poserSupplementBudget(montant: number): void {
  if (budgetGele === null || supplementBudget === montant) return;
  supplementBudget = montant;
  notifier();
}

/** Rend la caisse à sa valeur réelle. Sans effet si rien n'est gelé. */
export function degelerBudgetAffichage(): void {
  if (budgetGele === null) return;
  budgetGele = null;
  supplementBudget = 0;
  notifier();
}

/** Renvoie la caisse figée (supplément compris) tant que le gel dure. */
export function useBudgetAffiche(reel: number): number {
  const gele = useSyncExternalStore(souscrire, lireBudget, lireBudgetServeur);
  return gele ?? reel;
}

/** Énergie affichée figée pendant la cérémonie de livraison (jeton ⚡ en vol). */
let energieGelee: number | null = null;

function lireEnergie(): number | null {
  return energieGelee;
}
function lireEnergieServeur(): number | null {
  return null;
}

/** Fige l'affichage de l'énergie du header sur cette valeur. Idempotent. */
export function gelerEnergieAffichage(valeur: number): void {
  energieGelee = valeur;
  notifier();
}

/** Rend l'énergie affichée à sa valeur réelle. Sans effet si rien n'est gelé. */
export function degelerEnergieAffichage(): void {
  if (energieGelee === null) return;
  energieGelee = null;
  notifier();
}

/** Renvoie l'énergie figée tant que le gel dure, la valeur réelle sinon. */
export function useEnergieAffiche(reel: number): number {
  const gele = useSyncExternalStore(souscrire, lireEnergie, lireEnergieServeur);
  return gele ?? reel;
}
