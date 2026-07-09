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
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleCategorie } from "@/lib/i18n/libelles";
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
  /**
   * Optionnel : pour chaque catégorie, indique s'il y a des items découverts
   * non encore consultés dans la collection (affiche un astérisque rouge).
   */
  nouveautesParCat?: Partial<Record<CategorieObjet, boolean>>;
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
  gap: 3,
  padding: "4px 2px 6px",
  position: "relative",
  cursor: "pointer",
};

const countText: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.04em",
  color: "var(--brass-700)",
};

const newStarStyle: CSSProperties = {
  position: "absolute",
  top: 2,
  right: 4,
  fontFamily: "var(--font-display)",
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1,
  color: "var(--vermillion-600)",
  pointerEvents: "none",
};

export function CategoriePicker({
  selection,
  onChange,
  comptesParCat,
  total,
  totauxParCat,
  totalGlobal,
  nouveautesParCat,
}: CategoriePickerProps) {
  const { d } = useLangue();
  const showFraction = totauxParCat !== undefined;
  const hasAnyNew =
    !!nouveautesParCat && CATEGORIES.some((c) => nouveautesParCat[c]);
  const cells: Array<{
    key: string;
    cat: CategorieObjet | null;
    icon: LucideIcon;
    count: number;
    max: number | null;
    label: string;
    nouveau: boolean;
  }> = [
    {
      key: "all",
      cat: null,
      icon: LayoutGrid,
      count: total,
      max: showFraction ? (totalGlobal ?? null) : null,
      label: d.inventaire.tous,
      nouveau: hasAnyNew,
    },
    ...CATEGORIES.map((c) => ({
      key: c,
      cat: c as CategorieObjet | null,
      icon: ICONS[c] ?? LayoutGrid,
      count: comptesParCat[c] ?? 0,
      max: showFraction ? (totauxParCat?.[c] ?? null) : null,
      label: libelleCategorie(c, d),
      nouveau: !!nouveautesParCat?.[c],
    })),
  ];

  return (
    <div
      role="tablist"
      aria-label={d.inventaire.filtreParCategorie}
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
            {cell.nouveau && (
              <span style={newStarStyle} aria-label={d.inventaire.nouveautes}>
                *
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
