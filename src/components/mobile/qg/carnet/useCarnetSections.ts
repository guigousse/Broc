"use client";

import { useCallback, useState } from "react";
import {
  safeLocalStorageGet,
  safeLocalStorageSet,
} from "@/lib/storage/safeLocalStorage";

/** Clé de préférence d'affichage — même convention que `broc.qg-edit.enabled`. */
export const CLE_STOCKAGE_CARNET = "broc.carnet.sections";

export type CleSection = "histoire" | "quotidiennes" | "hebdomadaires";

type EtatReplis = Partial<Record<CleSection, boolean>>;

/**
 * Lecture défensive : `localStorage` peut être absent (SSR), inaccessible, ou
 * contenir n'importe quoi (main humaine, version antérieure). Aucun de ces cas
 * ne doit empêcher le carnet de s'ouvrir — on retombe sur « tout déplié ».
 *
 * Réutilise `safeLocalStorageGet` pour l'accès SSR-safe, puis valide le type.
 * Exportée pour tester la robustesse SSR en isolation.
 */
export function lire(): EtatReplis {
  const parse = safeLocalStorageGet<unknown>(CLE_STOCKAGE_CARNET, {});
  // safeLocalStorageGet retourne n'importe quel JSON valide, y compris des
  // primitives. On accepte seulement un objet (pas array, pas null, pas chaîne).
  if (typeof parse !== "object" || parse === null || Array.isArray(parse)) return {};
  return parse as EtatReplis;
}

/**
 * Écriture au mieux : un quota plein ne doit pas casser l'interaction.
 * Réutilise `safeLocalStorageSet` qui gère SSR et les exceptions silencieusement.
 */
function ecrire(etat: EtatReplis): void {
  // safeLocalStorageSet stringify en interne, on passe l'objet directement
  safeLocalStorageSet(CLE_STOCKAGE_CARNET, etat);
}

/**
 * Repli des sections du carnet. Une clé absente vaut « dépliée » : l'état par
 * défaut n'écrit donc rien, et une sauvegarde neuve ouvre le carnet en entier.
 */
export function useCarnetSections() {
  const [replis, setReplis] = useState<EtatReplis>(() => lire());

  const estRepliee = useCallback((c: CleSection) => replis[c] === true, [replis]);

  const basculer = useCallback((c: CleSection) => {
    // Calculer le nouvel état AVANT de l'écrire, pour respecter les règles de
    // React Strict Mode (les updaters ne doivent pas avoir d'effets de bord).
    const next = { ...replis, [c]: !replis[c] };
    setReplis(next);
    ecrire(next);
  }, [replis]);

  /**
   * Force une section dépliée (ouverture ciblée d'une quête depuis un badge
   * livrable) — ÉCRIT la préférence, contrairement à un masquage au rendu qui
   * la laisserait intacte mais mentirait tant que la cible reste affichée.
   * Sans effet si la section est déjà dépliée : pas d'écriture inutile.
   */
  const deplier = useCallback((c: CleSection) => {
    if (replis[c] !== true) return;
    const next = { ...replis, [c]: false };
    setReplis(next);
    ecrire(next);
  }, [replis]);

  return { estRepliee, basculer, deplier };
}
