"use client";

import type { CSSProperties } from "react";
import {
  BookOpenText,
  Disc3,
  Gamepad2,
  Hammer,
  Home,
  LayoutGrid,
  Palette,
  Shirt,
  type LucideIcon,
} from "lucide-react";
import type { CategorieObjet } from "@/types/game";

interface CategorieChipsProps {
  /** `null` = bouton « Tous » sélectionné. */
  selection: CategorieObjet | null;
  onChange: (c: CategorieObjet | null) => void;
  comptesParCat: Partial<Record<CategorieObjet, number>>;
  categories: readonly CategorieObjet[];
}

const ICONS: Record<CategorieObjet, LucideIcon> = {
  Musique: Disc3,
  "Jeux & Loisirs": Gamepad2,
  "Livres & Papeterie": BookOpenText,
  Mode: Shirt,
  Maison: Home,
  "Objets d'art": Palette,
  Bricolage: Hammer,
};

const cellBase: CSSProperties = {
  aspectRatio: "1 / 1",
  border: "1px solid var(--brass-500)",
  background: "var(--paper-100)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 2,
  position: "relative",
  cursor: "pointer",
};

export function CategorieChips({
  selection,
  onChange,
  comptesParCat,
  categories,
}: CategorieChipsProps) {
  const totalCells = categories.length + 1;
  return (
    <div
      role="tablist"
      aria-label="Filtre par thème"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${totalCells}, 1fr)`,
        gap: 4,
      }}
    >
      <button
        type="button"
        role="tab"
        aria-selected={selection === null}
        onClick={() => onChange(null)}
        title="Tous"
        style={{
          ...cellBase,
          background:
            selection === null ? "var(--forest-800)" : "var(--paper-100)",
          boxShadow:
            selection === null
              ? "inset 0 0 0 2px var(--forest-800), inset 0 0 0 3px var(--brass-500)"
              : "none",
        }}
      >
        <LayoutGrid
          size={16}
          strokeWidth={1.5}
          color={
            selection === null ? "var(--brass-300)" : "var(--forest-800)"
          }
        />
      </button>
      {categories.map((c) => {
        const n = comptesParCat[c] ?? 0;
        const active = selection === c;
        const Icon = ICONS[c];
        return (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(c)}
            title={c}
            style={{
              ...cellBase,
              background: active ? "var(--forest-800)" : "var(--paper-100)",
              boxShadow: active
                ? "inset 0 0 0 2px var(--forest-800), inset 0 0 0 3px var(--brass-500)"
                : "none",
              opacity: n === 0 ? 0.45 : 1,
            }}
          >
            <Icon
              size={16}
              strokeWidth={1.5}
              color={active ? "var(--brass-300)" : "var(--forest-800)"}
            />
          </button>
        );
      })}
    </div>
  );
}
