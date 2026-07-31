"use client";

import { useState, type CSSProperties } from "react";
import type { ActiveId } from "@/lib/actives";

export interface MedaillonAtoutProps {
  /** « diplomate » n'a pas de webp médaillon : exclu par le type. */
  activeId: Exclude<ActiveId, "diplomate">;
  /** Diamètre en px (32 timeline du parcours, 44 level-up, 96 fiche). */
  taille: number;
  /** Filtre du dock verrouillé — réservé au parcours « à venir ». */
  grise?: boolean;
  /** Palier 2ᵉ/3ᵉ usage : badge « +1 » au coin bas-droit. */
  bonusUsage?: boolean;
  /** Affiché si le webp manque (onError), même mécanique que SkillDock. */
  emojiFallback: string;
}

/**
 * Médaillon de laiton d'un atout, hors dock : sertissure identique aux
 * cercles du SkillDock. Décoratif (aria-hidden) — le titre adjacent porte
 * toujours l'information.
 */
export function MedaillonAtout({
  activeId,
  taille,
  grise,
  bonusUsage,
  emojiFallback,
}: MedaillonAtoutProps) {
  const [imgKo, setImgKo] = useState(false);
  const filtre = grise ? "grayscale(1) brightness(0.55)" : "none";
  return (
    <span style={cadre(taille)} aria-hidden="true">
      {imgKo ? (
        <span style={{ fontSize: Math.round(taille * 0.55), filter: filtre }}>
          {emojiFallback}
        </span>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={`/competences/atout.${activeId}.webp`}
          alt=""
          onError={() => setImgKo(true)}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            objectFit: "cover",
            filter: filtre,
          }}
        />
      )}
      {bonusUsage && <span style={badge(taille)}>+1</span>}
    </span>
  );
}

const cadre = (taille: number): CSSProperties => ({
  position: "relative",
  width: taille,
  height: taille,
  borderRadius: "50%",
  border: "2px solid var(--brass-500)",
  background: "var(--forest-800)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  boxSizing: "border-box",
});

/** Pastille « +1 » : même recette que la pastille d'usages du dock. */
const badge = (taille: number): CSSProperties => {
  const h = Math.max(14, Math.round(taille * 0.32));
  return {
    position: "absolute",
    right: -Math.round(h * 0.2),
    bottom: -Math.round(h * 0.2),
    minWidth: h,
    height: h,
    padding: "0 3px",
    borderRadius: 999,
    background: "var(--brass-500)",
    border: "1.5px solid var(--forest-800)",
    color: "var(--forest-800)",
    fontFamily: "var(--font-mono)",
    fontSize: Math.max(9, Math.round(h * 0.55)),
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
  };
};
