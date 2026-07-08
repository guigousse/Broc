"use client";

import type { CSSProperties } from "react";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleEtat } from "@/lib/i18n/libelles";
import type { EtatObjet } from "@/types/game";

interface ConfirmReplaceModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** `valeur` est `null` quand la valeur de marché de la catégorie n'est pas
   *  encore connue (Connaisseur 2 absent) — affichée « ? » plutôt que masquée. */
  nouvelObjet: { nom: string; etat: EtatObjet; valeur: number | null };
  /** `valeur` est `null` selon la même règle que `nouvelObjet` (catégorie non
   *  connue via Connaisseur 2) — affichée « ? » plutôt que masquée. */
  ancienneDonation: { etat: EtatObjet; valeur: number | null };
}

const backdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 110,
  background: "rgba(15,31,24,0.78)",
  display: "grid",
  placeItems: "center",
  padding: "20px",
};

const card: CSSProperties = {
  maxWidth: 360,
  width: "100%",
  background: "var(--paper-100)",
  border: "1px solid var(--brass-500)",
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
  padding: "20px",
};

const title: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 11,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
  textAlign: "center",
  marginBottom: 16,
};

const body: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 14,
  lineHeight: 1.45,
  color: "var(--ink-700)",
  marginBottom: 18,
};

const btn = (variant: "ghost" | "primary"): CSSProperties => ({
  flex: 1,
  padding: "10px 12px",
  fontFamily: "var(--font-display)",
  fontSize: 11,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  border: "1px solid var(--brass-500)",
  background: variant === "primary" ? "var(--forest-800)" : "var(--paper-200)",
  color: variant === "primary" ? "var(--brass-300)" : "var(--ink-700)",
  cursor: "pointer",
});

export function ConfirmReplaceModal({
  open,
  onClose,
  onConfirm,
  nouvelObjet,
  ancienneDonation,
}: ConfirmReplaceModalProps) {
  const { d, tr } = useLangue();
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={d.inventaire.remplacerDonationAria}
      style={backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={card}>
        <div style={title}>{d.inventaire.remplacerDonationTitre}</div>
        <p style={body}>
          {tr(d.inventaire.remplacerCorps, {
            nom: nouvelObjet.nom,
            ancienEtat: libelleEtat(ancienneDonation.etat, d).toLowerCase(),
            ancienneValeur:
              ancienneDonation.valeur === null ? "?" : ancienneDonation.valeur,
            nouvelEtat: libelleEtat(nouvelObjet.etat, d).toLowerCase(),
            nouvelleValeur:
              nouvelObjet.valeur === null ? "?" : nouvelObjet.valeur,
          })}
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={onClose} style={btn("ghost")}>
            {d.commun.annuler}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            style={btn("primary")}
          >
            {d.inventaire.remplacer}
          </button>
        </div>
      </div>
    </div>
  );
}
