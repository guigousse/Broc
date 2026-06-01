"use client";

import { Cog } from "lucide-react";
import type { CategorieObjet } from "@/types/game";
import { CATEGORIES } from "@/data/categories";
import { CategorieIcon } from "@/components/ui/CategorieIcon";

interface PiecesInventoryBarProps {
  pieces: Record<CategorieObjet, number>;
}

const COG_SIZE = 36;
const ICON_SIZE = 16;

/**
 * Bandeau horizontal des 7 catégories sous forme d'engrenages laiton.
 * Chaque case = <Cog /> lucide (stroke laiton) + <CategorieIcon /> centrée
 * + compteur monospace en dessous. Scroll horizontal sur viewport étroit.
 */
export function PiecesInventoryBar({ pieces }: PiecesInventoryBarProps) {
  return (
    <div
      role="list"
      aria-label="Inventaire de pièces d'amélioration"
      style={{
        display: "flex",
        gap: 4,
        padding: "6px 2px 8px",
      }}
    >
      {CATEGORIES.map((cat) => (
        <div
          key={cat}
          role="listitem"
          title={`${cat} : ${pieces[cat] ?? 0} pièces`}
          style={{
            flex: "0 0 auto",
            width: 44,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          <div
            aria-hidden
            style={{
              position: "relative",
              width: COG_SIZE,
              height: COG_SIZE,
              display: "grid",
              placeItems: "center",
              filter: "drop-shadow(0 1px 1px rgba(40,25,5,0.30))",
            }}
          >
            <Cog
              size={COG_SIZE}
              strokeWidth={1.5}
              color="var(--brass-700)"
              fill="var(--paper-100)"
            />
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                display: "grid",
                placeItems: "center",
                lineHeight: 0,
              }}
            >
              <CategorieIcon
                categorie={cat}
                size={ICON_SIZE}
                strokeWidth={1.6}
                color="var(--forest-800)"
              />
            </div>
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--ink-700)",
              letterSpacing: "0.04em",
            }}
          >
            {pieces[cat] ?? 0}
          </div>
        </div>
      ))}
    </div>
  );
}
