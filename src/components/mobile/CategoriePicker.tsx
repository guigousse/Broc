"use client";

import type { CSSProperties } from "react";
import {
  Disc3,
  Gamepad2,
  BookOpenText,
  Shirt,
  Home,
  Palette,
  Hammer,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import { CATEGORIES } from "@/data/categories";
import type { CategorieObjet } from "@/types/game";

interface CategoriePickerProps {
  /** `null` = "Tous" sélectionné. */
  selection: CategorieObjet | null;
  onChange: (c: CategorieObjet | null) => void;
  comptesParCat: Partial<Record<CategorieObjet, number>>;
  total: number;
  /**
   * Optionnel : si fourni, affiche le compté en "X/Y" (collection) au lieu
   * du seul compté (stockage). La valeur est le nombre de slots possibles
   * dans chaque catégorie.
   */
  totauxParCat?: Partial<Record<CategorieObjet, number>>;
  /** Optionnel : total global (somme des totauxParCat) pour le bouton "Tous". */
  totalGlobal?: number;
}

const ICONS: Record<string, LucideIcon> = {
  Musique: Disc3,
  "Jeux & Loisirs": Gamepad2,
  "Livres & Papeterie": BookOpenText,
  Mode: Shirt,
  Maison: Home,
  "Objets d'art": Palette,
  Bricolage: Hammer,
};

const cellBase: CSSProperties = {
  // hauteur fixe (évite un bug iOS où aspect-ratio ne se recalcule pas après rotation)
  height: 48,
  minWidth: 0,
  border: "1px solid var(--brass-500)",
  background: "var(--paper-100)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 1,
  padding: 2,
  position: "relative",
  cursor: "pointer",
};

const countText: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 7,
  letterSpacing: "0.04em",
  color: "var(--brass-700)",
};

export function CategoriePicker({
  selection,
  onChange,
  comptesParCat,
  total,
  totauxParCat,
  totalGlobal,
}: CategoriePickerProps) {
  const showFraction = totauxParCat !== undefined;
  const cells: Array<{
    key: string;
    cat: CategorieObjet | null;
    icon: LucideIcon;
    count: number;
    max: number | null;
    label: string;
  }> = [
    {
      key: "all",
      cat: null,
      icon: LayoutGrid,
      count: total,
      max: showFraction ? (totalGlobal ?? null) : null,
      label: "Tous",
    },
    ...CATEGORIES.map((c) => ({
      key: c,
      cat: c as CategorieObjet | null,
      icon: ICONS[c] ?? LayoutGrid,
      count: comptesParCat[c] ?? 0,
      max: showFraction ? (totauxParCat?.[c] ?? null) : null,
      label: c,
    })),
  ];

  return (
    <div
      role="tablist"
      aria-label="Filtre par catégorie"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cells.length}, 1fr)`,
        gap: 4,
      }}
    >
      {cells.map((cell) => {
        const active = cell.cat === selection;
        const Icon = cell.icon;
        const empty = cell.count === 0;
        return (
          <button
            key={cell.key}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(cell.cat)}
            style={{
              ...cellBase,
              background: active ? "var(--forest-800)" : "var(--paper-100)",
              boxShadow: active
                ? "inset 0 0 0 2px var(--forest-800), inset 0 0 0 3px var(--brass-500)"
                : "none",
              opacity: empty && !active ? 0.45 : 1,
            }}
            title={`${cell.label} (${cell.count})`}
          >
            <Icon
              size={14}
              strokeWidth={1.5}
              color={active ? "var(--brass-300)" : "var(--forest-800)"}
            />
            <span
              style={{
                ...countText,
                color: active ? "var(--brass-300)" : "var(--brass-700)",
              }}
            >
              {cell.max !== null ? `${cell.count}/${cell.max}` : cell.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
