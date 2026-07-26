"use client";

import type { CSSProperties } from "react";
import type { CamionConfig } from "@/data/camion";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { getCoffreAssets } from "@/lib/coffreAssets";
import { useLangue } from "@/lib/i18n/LangueContext";
import { nomCamion } from "@/lib/i18n/contenu";

export interface ConcessionSheetProps {
  open: boolean;
  onClose: () => void;
  actuel: CamionConfig;
  prochain: CamionConfig;
  budget: number;
  onAcheter: () => void;
}

const corpsStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 12,
};

const vignetteStyle: CSSProperties = {
  width: "78%",
  maxWidth: 300,
  aspectRatio: "4 / 3",
  objectFit: "contain",
};

const comparatifStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--ink-500)",
};

const gainStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 15,
  letterSpacing: "0.08em",
  color: "var(--forest-800)",
};

const boutonStyle = (peut: boolean): CSSProperties => ({
  width: "100%",
  minHeight: 46,
  border: "1px solid var(--brass-500)",
  borderRadius: "var(--radius-btn)",
  background: peut ? "var(--forest-800)" : "var(--paper-200)",
  color: peut ? "var(--brass-300)" : "var(--ink-300)",
  fontFamily: "var(--font-display)",
  fontSize: 12,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  cursor: peut ? "pointer" : "not-allowed",
  opacity: peut ? 1 : 0.5,
});

const manqueStyle: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 12,
  color: "var(--vermillion-600)",
  margin: 0,
};

/**
 * Fiche du véhicule suivant : visuel, comparatif de capacité, prix et achat.
 * Décide seule de l'état de son bouton à partir du budget reçu.
 */
export function ConcessionSheet(p: ConcessionSheetProps) {
  const { d, tr, locale } = useLangue();

  const prix = p.prochain.prixUpgradeVersCeNiveau ?? 0;
  const peut = p.budget >= prix;
  const manque = prix - p.budget;
  const gain = p.prochain.capacitePlaces - p.actuel.capacitePlaces;
  const visuel = getCoffreAssets(p.prochain.visuelId)?.ferme ?? null;

  return (
    <BottomSheet
      open={p.open}
      onClose={p.onClose}
      title={nomCamion(p.prochain, locale)}
      // Sans bottomOffset, la sheet (z-index 40) passerait sous la barre
      // d'actions fixe de l'écran de chargement (z-index 50).
      bottomOffset="calc(var(--mobile-tabbar-h) + var(--safe-bottom))"
    >
      <div style={corpsStyle}>
        {visuel && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={visuel} alt="" draggable={false} style={vignetteStyle} />
        )}

        <div style={comparatifStyle}>
          <span>{tr(d.vente.placesCompte, { n: p.actuel.capacitePlaces })}</span>
          <span aria-hidden>→</span>
          <span>{tr(d.vente.placesCompte, { n: p.prochain.capacitePlaces })}</span>
        </div>

        <span style={gainStyle}>+{tr(d.vente.placesCompte, { n: gain })}</span>

        <button
          type="button"
          disabled={!peut}
          onClick={p.onAcheter}
          style={boutonStyle(peut)}
        >
          {tr(d.vente.acheterVehicule, { prix })}
        </button>

        {!peut && <p style={manqueStyle}>{tr(d.vente.manqueSomme, { somme: manque })}</p>}
      </div>
    </BottomSheet>
  );
}
