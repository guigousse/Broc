"use client";

import { useEffect, useState } from "react";
import {
  safeLocalStorageGet,
  safeLocalStorageSet,
} from "@/lib/storage/safeLocalStorage";

export const CLE_COLONNES = "broc.collection.colonnes";

export type Colonnes = 1 | 2 | 3 | 4 | 5;

function estColonnes(v: number): v is Colonnes {
  return Number.isInteger(v) && v >= 1 && v <= 5;
}

/**
 * Préférence "items par ligne" de la page Collection. Démarre à 3 (rendu
 * SSR stable) puis relit le localStorage au montage — évite un mismatch
 * d'hydratation au prix d'un éventuel reflow bref.
 */
export function useColonnesCollection(): [Colonnes, (v: Colonnes) => void] {
  const [colonnes, setColonnes] = useState<Colonnes>(3);

  useEffect(() => {
    const v = safeLocalStorageGet<number>(CLE_COLONNES, 3);
    if (estColonnes(v)) setColonnes(v);
  }, []);

  const changer = (v: Colonnes) => {
    setColonnes(v);
    safeLocalStorageSet(CLE_COLONNES, v);
  };

  return [colonnes, changer];
}
