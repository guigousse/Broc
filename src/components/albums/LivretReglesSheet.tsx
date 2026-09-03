"use client";

import type { CSSProperties } from "react";
import { X } from "lucide-react";
import { RoueCategories } from "@/components/albums/RoueCategories";
import { ficheBackdrop } from "@/components/ui/FicheObjet";
import { libelleMotCle } from "@/lib/duel/libelles";
import { useLangue } from "@/lib/i18n/LangueContext";

const MOTS_CLES = [
  "barrage",
  "prompt",
  "solide",
  "fragile",
  "ruse",
  "cri",
] as const;

const backdrop: CSSProperties = { ...ficheBackdrop, zIndex: 106, alignItems: "stretch" };
const feuille: CSSProperties = {
  width: "min(100%, 520px)",
  maxHeight: "100%",
  overflowY: "auto",
  margin: "0 auto",
  alignSelf: "center",
  background: "var(--paper-100)",
  color: "var(--ink-900, #1f1a12)",
  borderRadius: 10,
  padding: "18px 18px 24px",
  boxSizing: "border-box",
  fontFamily: "var(--font-body)",
  fontSize: 14,
  lineHeight: 1.45,
  position: "relative",
};
const titre: CSSProperties = {
  margin: "0 32px 12px 0",
  fontSize: 20,
  fontFamily: "var(--font-display)",
};
const croix: CSSProperties = {
  position: "absolute",
  top: 10,
  right: 10,
  width: "var(--tap-min)",
  height: "var(--tap-min)",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
};
const para: CSSProperties = { margin: "0 0 10px" };
const sousTitre: CSSProperties = { margin: "14px 0 6px", fontSize: 15 };
const motCle: CSSProperties = { margin: "0 0 6px" };

export function LivretReglesSheet({ onClose }: { onClose: () => void }) {
  const { d } = useLangue();
  const D = d.duel;
  const R = d.duel as unknown as Record<string, string>;
  return (
    <div
      style={backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={feuille} role="dialog" aria-labelledby="livret-titre">
        <h2 id="livret-titre" style={titre}>
          {D.livretTitre}
        </h2>
        <button
          type="button"
          style={croix}
          onClick={onClose}
          aria-label={d.commun.fermer}
        >
          <X size={18} strokeWidth={1.5} />
        </button>
        {[
          D.livretMiseEnPlace,
          D.livretTour,
          D.livretAttaque,
          D.livretRoue,
          D.livretVictoire,
        ].map((p, i) => (
          <p key={i} style={para} data-testid="livret-paragraphe">
            {p}
          </p>
        ))}
        <RoueCategories />
        <h3 style={sousTitre}>{D.livretMotsCles}</h3>
        {MOTS_CLES.map((mc) => (
          <p key={mc} style={motCle} data-testid="livret-mot-cle">
            <strong>{mc === "cri" ? D.mc_cri_nom : libelleMotCle(mc, d)}</strong>{" "}
            — {R[`mc_${mc}_regle`]}
          </p>
        ))}
      </div>
    </div>
  );
}
