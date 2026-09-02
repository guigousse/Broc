"use client";

import { Lock } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useLangue } from "@/lib/i18n/LangueContext";

/* ── TUILE ALBUM DANS LA COLLECTION (Tâche 13) ────────────────────────────
   Injectée en tête de sa catégorie par `CollectionGrid` (prop
   `casesSpeciales`). Avant achat au Bazar : cadenassée, un cadenas laiton,
   inerte. Après achat : icône de l'album + compteur `d.albums.compteur`
   (même gabarit « {n} / {total} » qu'`AlbumShell`) + pastille « nouveau »
   tant qu'une pièce reste non consultée.

   Deux rendus après achat : `sticker` (l'album a son art → il se présente
   COMME LES AUTRES ITEMS de la grille, sticker nu sur la planche, badges en
   surimpression — recette 2026-09-02) ou la boîte sombre d'origine (le
   classeur, encore en placeholder lucide). */

const tuile: CSSProperties = {
  aspectRatio: "1 / 1",
  position: "relative",
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  border: "1px solid var(--brass-500)",
  borderRadius: 8,
  background: "var(--forest-800)",
  padding: "10%",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  color: "var(--brass-300)",
};

/** La case façon `CollectionGrid` : transparente, le sticker respire dans
 *  ses 12 % de marge — mêmes valeurs que `cellStyle` là-bas. */
const tuileSticker: CSSProperties = {
  aspectRatio: "1 / 1",
  position: "relative",
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  border: "none",
  background: "transparent",
  padding: "12%",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
};

/** Compteur en PASTILLE laiton (recette 2026-09-02 : le halo papier ne
 *  suffisait pas sur le bois) — même famille que les badges ×N des albums. */
const compteurSticker: CSSProperties = {
  position: "absolute",
  left: "50%",
  bottom: 0,
  transform: "translateX(-50%)",
  padding: "1px 7px",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.04em",
  whiteSpace: "nowrap",
  color: "var(--forest-800)",
  background: "linear-gradient(180deg, var(--brass-300), var(--brass-500))",
  borderRadius: 4,
  boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
  pointerEvents: "none",
};

const compteurStyle: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 4,
  textAlign: "center",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.04em",
  color: "var(--brass-300)",
  pointerEvents: "none",
};

const newBadge: CSSProperties = {
  position: "absolute",
  top: 2,
  right: 4,
  fontFamily: "var(--font-display)",
  fontSize: 22,
  fontWeight: 700,
  lineHeight: 1,
  color: "var(--vermillion-600)",
  textShadow:
    "0 0 2px var(--paper-100), 0 0 4px var(--paper-100), 0 1px 2px rgba(0,0,0,0.45)",
  pointerEvents: "none",
};

interface TuileAlbumProps {
  titre: string;
  icon: ReactNode;
  achete: boolean;
  possedees: number;
  total: number;
  nouveau: boolean;
  onTap: () => void;
  /** L'album a son art : case transparente façon grille, sticker nu. */
  sticker?: boolean;
}

export function TuileAlbum({
  titre,
  icon,
  achete,
  possedees,
  total,
  nouveau,
  onTap,
  sticker = false,
}: TuileAlbumProps) {
  const { d, tr } = useLangue();
  const compteur = tr(d.albums.compteur, { n: possedees, total });

  if (!achete) {
    return (
      <button
        type="button"
        data-testid="tuile-album"
        disabled
        aria-label={`${titre} — ${d.albums.enVenteAuBazar}`}
        style={{ ...tuile, cursor: "default" }}
      >
        <Lock size={22} strokeWidth={2} color="var(--brass-500)" />
      </button>
    );
  }

  return (
    <button
      type="button"
      data-testid="tuile-album"
      aria-label={`${titre} — ${compteur}`}
      style={sticker ? tuileSticker : tuile}
      onClick={onTap}
    >
      {icon}
      <span style={sticker ? compteurSticker : compteurStyle}>{compteur}</span>
      {nouveau && (
        <span style={newBadge} aria-label={d.albums.nouveau}>
          *
        </span>
      )}
    </button>
  );
}
