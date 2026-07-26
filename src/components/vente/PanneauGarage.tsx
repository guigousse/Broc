"use client";

import type { CSSProperties } from "react";
import type { CamionConfig } from "@/data/camion";
import { useLangue } from "@/lib/i18n/LangueContext";
import { nomCamion } from "@/lib/i18n/contenu";

export interface PanneauGarageProps {
  /** Palier suivant, ou `null` si le niveau max est atteint. */
  prochain: CamionConfig | null;
  /**
   * Le budget couvre-t-il le prix ? Grise le panneau SANS le désactiver :
   * pouvoir consulter ce qu'on ne peut pas encore s'offrir entretient l'envie,
   * là où un bouton mort n'expliquerait rien.
   */
  peutPayer: boolean;
  onOuvrir: () => void;
}

const panneauStyle = (peutPayer: boolean): CSSProperties => ({
  // Posé sur le mur du garage : le fond est en portrait et le véhicule est
  // centré vers garageY 0,63-0,70, la bande haute est donc libre.
  position: "absolute",
  left: "6%",
  top: "5%",
  zIndex: 2,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 1,
  padding: "7px 11px",
  border: "1px solid var(--brass-500)",
  borderRadius: 3,
  background: "var(--paper-100)",
  boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
  rotate: "-2.5deg",
  cursor: "pointer",
  opacity: peutPayer ? 1 : 0.62,
  filter: peutPayer ? undefined : "grayscale(0.7)",
  lineHeight: 1.15,
});

const surtitreStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
};

const nomStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 14,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--forest-800)",
};

const detailStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.04em",
  color: "var(--ink-500)",
};

/**
 * Pancarte de concession accrochée au mur du garage, sur l'écran de
 * chargement du coffre. Purement présentationnelle : elle ne connaît ni le
 * GameState, ni le budget brut, ni l'achat lui-même.
 */
export function PanneauGarage(p: PanneauGarageProps) {
  const { d, tr, locale } = useLangue();
  if (!p.prochain) return null;

  const places = tr(d.vente.placesCompte, { n: p.prochain.capacitePlaces });
  const prix = p.prochain.prixUpgradeVersCeNiveau ?? 0;

  return (
    <button
      type="button"
      onClick={p.onOuvrir}
      style={panneauStyle(p.peutPayer)}
      aria-label={tr(d.vente.acheterVehicule, { prix })}
    >
      <span style={surtitreStyle}>{d.vente.concession}</span>
      <span style={nomStyle}>{nomCamion(p.prochain, locale)}</span>
      <span style={detailStyle}>
        {places} · {prix} €
      </span>
    </button>
  );
}
