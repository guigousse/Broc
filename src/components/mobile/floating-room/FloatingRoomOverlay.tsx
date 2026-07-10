"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * Châssis « fenêtre flottante » des pièces (stockage aujourd'hui, atelier
 * et collection à terme) : s'affiche PAR-DESSUS le panorama du bureau,
 * entre le header et la TabBar, avec fond flouté (même habillage que le
 * menu Réglages de l'accueil). Deux blocs séparés par un interstice
 * flouté :
 *   - `bande` (haut) : sort de sous le header et glisse vers le bas ;
 *   - `children` (panneau bas, scrollable) : sort de la TabBar et monte.
 * Pas de bouton fermer : on quitte par la TabBar ou le swipe d'onglets.
 * Le backdrop bloque tous les pointeurs vers le panorama derrière.
 */

const wrap: CSSProperties = {
  position: "fixed",
  top: "calc(var(--safe-top) + var(--mobile-header-h))",
  left: 0,
  right: 0,
  bottom: "calc(var(--mobile-tabbar-h) + var(--safe-bottom))",
  // > panorama et ses dots (≤5) ; < BottomSheet (40) et overlays détail (105+).
  zIndex: 35,
  background: "rgba(15,31,24,0.35)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: "10px 12px 12px",
  // Clippe les deux blocs pendant leur glissement d'entrée : la bande
  // semble sortir de sous le header, le panneau de la TabBar.
  overflow: "hidden",
  boxSizing: "border-box",
};

/* Habillage carte des modales du menu (Réglages/Parties/Crédits), sur
   fond papier pour garder la lisibilité de la grille d'items. */
const carte: CSSProperties = {
  border: "1px solid var(--brass-500)",
  borderRadius: "var(--radius-card)",
  boxShadow:
    "0 16px 32px rgba(0,0,0,0.38), inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
  background: "var(--paper-100)",
};

const bandeStyle: CSSProperties = {
  ...carte,
  flexShrink: 0,
  padding: "8px 10px 10px",
  animation: "broc-float-bande-in 320ms ease-out",
};

/* Le milieu n'est PAS une carte : bloc libre sur le fond flouté — ses
   éléments (ex. les 3 slots d'atelier) portent leur propre habillage et
   flottent indépendamment les uns des autres. */
const milieuStyle: CSSProperties = {
  flexShrink: 0,
  // Fondu simple : le milieu apparaît entre les deux blocs qui glissent.
  animation: "broc-fade-in 320ms ease-out",
};

const panneauStyle: CSSProperties = {
  ...carte,
  // Le panneau épouse la hauteur de son contenu (pas de grand blanc quand
  // il y a peu d'items) ; au-delà de la place disponible, il rétrécit
  // (flex-shrink) et son contenu scrolle.
  flex: "0 1 auto",
  minHeight: 0,
  overflowY: "auto",
  WebkitOverflowScrolling: "touch",
  padding: 10,
  animation: "broc-float-panneau-in 320ms ease-out",
};

interface FloatingRoomOverlayProps {
  /** Carte haute (titre, actions, filtres). Glisse depuis le haut. */
  bande: ReactNode;
  /** Bloc carte optionnel entre bande et panneau (ex. slots d'atelier). */
  milieu?: ReactNode;
  /** Panneau bas (contenu scrollable). Monte depuis le bas. */
  children: ReactNode;
}

export function FloatingRoomOverlay({
  bande,
  milieu,
  children,
}: FloatingRoomOverlayProps) {
  return (
    <div style={wrap} data-floating-room="1">
      <div style={bandeStyle}>{bande}</div>
      {milieu !== undefined && <div style={milieuStyle}>{milieu}</div>}
      <div style={panneauStyle}>{children}</div>
    </div>
  );
}
