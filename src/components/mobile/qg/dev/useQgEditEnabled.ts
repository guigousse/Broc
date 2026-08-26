"use client";

import { useEffect, useState } from "react";
import { OUTILS_DEV } from "@/lib/outilsDev";

const CLE_STOCKAGE = "broc.qg-edit.enabled";

/**
 * Gate du mode calage à la souris, partagé par toutes les scènes qui le
 * portent (le QG, le Bazar). Le mode est :
 *   - activé par défaut si `NEXT_PUBLIC_QG_EDIT=1` au build, OU
 *   - activable via `?qgedit=1` (persiste ensuite dans localStorage), OU
 *   - désactivable via `?qgedit=0` (efface la clé).
 *
 * En production `OUTILS_DEV` est `false` à la compilation : ni le paramètre
 * d'URL ni une clé localStorage résiduelle ne peuvent rallumer l'outil sur
 * l'appareil d'un joueur.
 *
 * ⚠ Deux hooks, toujours appelés, jamais conditionnels : dans `(qg)/layout`
 * leurs ancêtres directs vivaient APRÈS un early return, ce qui a valu un
 * crash React #310 (« Rendered more hooks »). Ce hook doit rester au-dessus de
 * tout `return` anticipé de son appelant.
 */
export function useQgEditEnabled(): boolean {
  const [editEnabled, setEditEnabled] = useState(
    () => OUTILS_DEV && process.env.NEXT_PUBLIC_QG_EDIT === "1",
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!OUTILS_DEV) return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get("qgedit");
    if (q === "1") {
      window.localStorage.setItem(CLE_STOCKAGE, "1");
      setEditEnabled(true);
      return;
    }
    if (q === "0") {
      window.localStorage.removeItem(CLE_STOCKAGE);
      setEditEnabled(process.env.NEXT_PUBLIC_QG_EDIT === "1");
      return;
    }
    if (window.localStorage.getItem(CLE_STOCKAGE) === "1") {
      setEditEnabled(true);
    }
  }, []);
  return editEnabled;
}
