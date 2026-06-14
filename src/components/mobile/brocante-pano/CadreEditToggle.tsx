"use client";

import { Wrench } from "lucide-react";
import type { CSSProperties } from "react";
import { useBrocanteFramesEdit } from "./BrocanteFramesEditContext";

const btnStyle = (active: boolean): CSSProperties => ({
  position: "fixed",
  top: "calc(var(--safe-top, 0px) + var(--mobile-header-h, 0px) + 8px)",
  right: 8,
  width: 36,
  height: 36,
  borderRadius: 18,
  border: "1px solid var(--brass-700)",
  background: active ? "var(--brass-500)" : "rgba(20,12,0,0.55)",
  color: active ? "var(--forest-800)" : "var(--brass-300)",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  zIndex: 90,
  boxShadow: "0 2px 8px rgba(0,0,0,0.55)",
  padding: 0,
  WebkitTapHighlightColor: "transparent",
});

/**
 * Petit bouton fixe (haut-droite, sous le header) pour activer/désactiver
 * le mode édition des cadres. Toujours présent, discret. Une fois actif,
 * l'overlay d'édition s'affiche sur la scène visible.
 */
export function CadreEditToggle() {
  const { enabled, setEnabled } = useBrocanteFramesEdit();
  return (
    <button
      type="button"
      onClick={() => setEnabled(!enabled)}
      style={btnStyle(enabled)}
      aria-label={enabled ? "Quitter l'édition des cadres" : "Éditer les cadres"}
      aria-pressed={enabled}
    >
      <Wrench size={18} strokeWidth={1.8} />
    </button>
  );
}
