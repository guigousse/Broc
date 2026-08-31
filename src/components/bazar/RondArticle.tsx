"use client";

import type { CSSProperties, ReactNode } from "react";

interface RondArticleProps {
  /** Diamètre du rond, en px. 48 sur l'étagère, 120 dans la fiche. */
  size?: number;
  children: ReactNode;
}

/**
 * Le rond crème qui porte l'icône PLACEHOLDER d'un album ou d'un paquet — même
 * famille que l'engrenage de `PieceIcon`, en attendant l'art de
 * `public/bazar/albums/*.webp` (non créé dans ce chantier). Quand il
 * arrivera, cette icône cède la place à un `<img>` : c'est pourquoi le rond
 * reste un simple cadre, sans rien qui présuppose une icône lucide dedans.
 */
export function RondArticle({ size = 48, children }: RondArticleProps) {
  const style: CSSProperties = {
    display: "grid",
    placeItems: "center",
    width: size,
    height: size,
    borderRadius: "50%",
    background: "var(--paper-100)",
    border: "2px solid var(--brass-500)",
    color: "var(--forest-800)",
  };
  return <span style={style}>{children}</span>;
}
