"use client";

import type { NiveauCamion } from "@/types/game";
import { CAMIONS } from "@/data/camion";

interface Props {
  niveau: NiveauCamion;
  onSetNiveauDev: (n: NiveauCamion) => void;
}

/**
 * Bouton flottant dev — cycle entre les niveaux de camion sans coût.
 * Affiché uniquement quand DEV_COFFRE_SWITCH est activé côté caller.
 */
export function CamionSwitcher({ niveau, onSetNiveauDev }: Props) {
  return (
    <button
      type="button"
      onClick={() => {
        const next = (((niveau - 1) + 1) % CAMIONS.length) + 1;
        onSetNiveauDev(next as NiveauCamion);
      }}
      aria-label="Dev: cycle camion level"
      style={{
        position: "fixed",
        top: "calc(8px + var(--safe-top))",
        right: 10,
        padding: "6px 10px",
        border: "1px dashed var(--vermillion-600)",
        background: "rgba(20, 20, 20, 0.78)",
        color: "var(--vermillion-600)",
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        cursor: "pointer",
        lineHeight: 1.2,
        borderRadius: 4,
        zIndex: 60,
      }}
    >
      DEV
      <br />
      N{niveau}
    </button>
  );
}
