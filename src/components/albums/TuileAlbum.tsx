"use client";

import { Lock } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useLangue } from "@/lib/i18n/LangueContext";

/* ── TUILE ALBUM DANS LA COLLECTION (Tâche 13) ────────────────────────────
   Injectée en tête de sa catégorie par `CollectionGrid` (prop
   `casesSpeciales`). Avant achat au Bazar : cadenassée, un cadenas laiton,
   inerte. Après achat : icône de l'album + compteur `d.albums.compteur`
   (même gabarit « {n} / {total} » qu'`AlbumShell`) + pastille « nouveau »
   tant qu'une pièce reste non consultée. */

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
}

export function TuileAlbum({
  titre,
  icon,
  achete,
  possedees,
  total,
  nouveau,
  onTap,
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
      style={tuile}
      onClick={onTap}
    >
      {icon}
      <span style={compteurStyle}>{compteur}</span>
      {nouveau && (
        <span style={newBadge} aria-label={d.albums.nouveau}>
          *
        </span>
      )}
    </button>
  );
}
