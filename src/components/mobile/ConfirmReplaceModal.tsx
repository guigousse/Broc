"use client";

import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { ItemSticker } from "@/components/ui/ItemSticker";
import { StarRow } from "@/components/ui/StarRow";
import { getRarityColors } from "@/lib/rarityColors";
import { etoileCount } from "@/lib/etat";
import { getTemplate } from "@/data/objetTemplates";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleEtat } from "@/lib/i18n/libelles";
import type { EtatObjet, Objet } from "@/types/game";

interface ConfirmReplaceModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** Le nouvel exemplaire (celui du stockage) — même template que celui
   *  déjà donné, seul l'état diffère. */
  objet: Objet | null;
  /** L'exemplaire actuellement dans la collection (avant). */
  ancienEtat: EtatObjet | null;
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

/* Avant/après : [exemplaire en collection] → [nouvel exemplaire]. */
const compareRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  marginBottom: 18,
};

const colonne: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
  width: 110,
};

const stickerBox: CSSProperties = {
  width: 96,
  height: 96,
};

const colonneLabel: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9.5,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
  textAlign: "center",
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
  objet,
  ancienEtat,
}: ConfirmReplaceModalProps) {
  const { d, tr } = useLangue();
  if (!open || !objet || ancienEtat === null) return null;

  const isUnique = !!getTemplate(objet.templateId)?.unique;
  const starColor = getRarityColors(objet.rarete, isUnique).outer;

  const colonneEtat = (etat: EtatObjet, label: string) => (
    <div style={colonne}>
      <div style={stickerBox}>
        <ItemSticker
          templateId={objet.templateId}
          categorie={objet.categorie}
          fill
          tilt={false}
          variant="normal"
          eager
        />
      </div>
      <StarRow
        filled={etoileCount(etat)}
        color={starColor}
        size={14}
        aria-label={tr(d.chine.etatAriaLabel, {
          etat: libelleEtat(etat, d),
        })}
      />
      <span style={colonneLabel}>{label}</span>
    </div>
  );

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
        <div style={compareRow}>
          {colonneEtat(ancienEtat, d.inventaire.enCollectionLabel)}
          <ArrowRight
            size={28}
            strokeWidth={2}
            color="var(--brass-700)"
            aria-hidden
          />
          {colonneEtat(objet.etat, d.inventaire.nouveauLabel)}
        </div>
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
