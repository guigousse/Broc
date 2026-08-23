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

/**
 * Interstice vertical entre les blocs du châssis. Exporté parce que la zone
 * des languettes doit l'ANNULER pour venir se glisser sous la carte : le flex
 * n'offre pas de réglage d'interstice par élément.
 */
export const GAP_WRAP = 12;

/**
 * Hauteur de languette cachée derrière la carte. C'est ce recouvrement qui
 * produit l'illusion : les onglets sortent de DERRIÈRE un cadre qui, lui,
 * n'est jamais rompu. Il sert aussi de réserve de padding aux languettes,
 * pour que leur libellé reste centré dans la seule partie visible tout en
 * gardant une cible tactile à pleine hauteur.
 */
export const RECOUVREMENT_ONGLETS = 16;

/**
 * Cran d'empilement de la carte. Les languettes INACTIVES passent dessous —
 * le cadre les traverse. La languette ACTIVE passe DESSUS (cf. ReserveTabs) :
 * son papier, qui est celui de la carte, recouvre le liseré haut et l'arête
 * entre l'onglet et la page disparaît.
 */
export const Z_CARTE = 1;

const wrap: CSSProperties = {
  position: "fixed",
  // La bannière de consigne du tutoriel flotte juste sous le header : sans
  // cette réserve (0 hors tutoriel), elle recouvrait la bande — c'est-à-dire
  // l'en-tête même que la visite guidée cherche à montrer (recette device
  // 2026-08-19, stockage et bibliothèque).
  top: "calc(var(--safe-top) + var(--mobile-header-h) + var(--tuto-banniere-h, 0px))",
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
  gap: GAP_WRAP,
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

/* Zone des languettes : rendue AVANT la carte et remontée sous elle. Un
   onglet enfant de la carte peindrait par-dessus son liseré (les enfants
   peignent après le fond ET la bordure du parent) — soit l'inverse exact de
   l'effet voulu. D'où le bloc frère. */
const ongletsStyle: CSSProperties = {
  flexShrink: 0,
  marginBottom: -(GAP_WRAP + RECOUVREMENT_ONGLETS),
  animation: "broc-float-bande-in 320ms ease-out",
};

const bandeStyle: CSSProperties = {
  ...carte,
  flexShrink: 0,
  // Contexte d'empilement : sans lui, le TEXTE des languettes ressortirait
  // par-dessus le fond de la carte (les contenus en ligne peignent dans une
  // passe ultérieure à celle des fonds).
  position: "relative",
  zIndex: Z_CARTE,
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
  /**
   * Languettes d'onglets, posées DERRIÈRE la carte : elles en dépassent par
   * le haut et leur bas disparaît sous elle. Optionnel — les pièces à un
   * seul écran (bibliothèque, bureau) n'en ont pas, et leur structure reste
   * exactement celle d'avant.
   */
  onglets?: ReactNode;
  /** Carte haute (titre, actions, filtres). Glisse depuis le haut. */
  bande: ReactNode;
  /** Bloc carte optionnel entre bande et panneau (ex. slots d'atelier). */
  milieu?: ReactNode;
  /** Panneau bas (contenu scrollable). Monte depuis le bas. */
  children: ReactNode;
  /**
   * Jouer l'entrée glissée de 320 ms ? Faux quand on arrive d'un onglet
   * frère de la même pièce : les deux cartes sont déjà en place, les faire
   * re-glisser serait lourd — et le coach du tutoriel mesurerait une cible
   * en mouvement.
   */
  animer?: boolean;
}

export function FloatingRoomOverlay({
  onglets,
  bande,
  milieu,
  children,
  animer = true,
}: FloatingRoomOverlayProps) {
  const sansAnim = { animation: "none" as const };
  return (
    <div style={wrap} data-floating-room="1" data-animer={animer ? "1" : "0"}>
      {onglets !== undefined && (
        <div style={animer ? ongletsStyle : { ...ongletsStyle, ...sansAnim }}>
          {onglets}
        </div>
      )}
      <div style={animer ? bandeStyle : { ...bandeStyle, ...sansAnim }}>{bande}</div>
      {milieu !== undefined && (
        <div style={animer ? milieuStyle : { ...milieuStyle, ...sansAnim }}>{milieu}</div>
      )}
      <div style={animer ? panneauStyle : { ...panneauStyle, ...sansAnim }}>
        {children}
      </div>
    </div>
  );
}
