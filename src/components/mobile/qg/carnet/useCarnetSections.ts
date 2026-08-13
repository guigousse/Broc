"use client";

import { useCallback, useState } from "react";

/** Clé de préférence d'affichage — même convention que `broc.qg-edit.enabled`. */
export const CLE_STOCKAGE_CARNET = "broc.carnet.sections";

export type CleSection = "histoire" | "quotidiennes" | "hebdomadaires";

type EtatReplis = Partial<Record<CleSection, boolean>>;

/**
 * Lecture défensive : `localStorage` peut être absent (SSR), inaccessible, ou
 * contenir n'importe quoi (main humaine, version antérieure). Aucun de ces cas
 * ne doit empêcher le carnet de s'ouvrir — on retombe sur « tout déplié ».
 */
function lire(): EtatReplis {
  try {
    const brut = window.localStorage.getItem(CLE_STOCKAGE_CARNET);
    if (!brut) return {};
    const parse: unknown = JSON.parse(brut);
    if (typeof parse !== "object" || parse === null || Array.isArray(parse)) return {};
    return parse as EtatReplis;
  } catch {
    return {};
  }
}

/** Écriture au mieux : un quota plein ne doit pas casser l'interaction. */
function ecrire(etat: EtatReplis): void {
  try {
    window.localStorage.setItem(CLE_STOCKAGE_CARNET, JSON.stringify(etat));
  } catch {
    /* préférence d'affichage : perdre l'écriture est sans conséquence */
  }
}

/**
 * Repli des sections du carnet. Une clé absente vaut « dépliée » : l'état par
 * défaut n'écrit donc rien, et une sauvegarde neuve ouvre le carnet en entier.
 */
export function useCarnetSections() {
  const [replis, setReplis] = useState<EtatReplis>(() => lire());

  const estRepliee = useCallback((c: CleSection) => replis[c] === true, [replis]);

  const basculer = useCallback((c: CleSection) => {
    setReplis((prev) => {
      const next = { ...prev, [c]: !prev[c] };
      ecrire(next);
      return next;
    });
  }, []);

  return { estRepliee, basculer };
}
