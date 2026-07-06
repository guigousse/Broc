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
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { CATEGORIES } from "@/data/categories";
import {
  TREE_GENERAL,
  catTreeId,
  getTreeMeta,
} from "@/data/competences";
import type { CategorieObjet, CompetenceTreeId } from "@/types/game";

interface TreePickerProps {
  /** Nombre de compétences débloquées par arbre (sur 12), calculé par le parent. */
  nbDebloqueesParTree: Record<CompetenceTreeId, number>;
  selectionne: CompetenceTreeId;
  onSelect: (id: CompetenceTreeId) => void;
}

const ICONS: Record<string, LucideIcon> = {
  general: Sparkles,
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
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 1,
  padding: 2,
  position: "relative",
  cursor: "pointer",
};

const lvlText: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 7,
  letterSpacing: "0.04em",
  color: "var(--brass-700)",
};

export function TreePicker({
  nbDebloqueesParTree,
  selectionne,
  onSelect,
}: TreePickerProps) {
  const allIds: CompetenceTreeId[] = [
    TREE_GENERAL,
    ...CATEGORIES.map((c) => catTreeId(c)),
  ];

  return (
    <div
      role="tablist"
      aria-label="Arbres de compétences"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${allIds.length}, 1fr)`,
        gap: 4,
      }}
    >
      {allIds.map((id) => {
        const meta = getTreeMeta(id);
        const active = id === selectionne;
        const nbDebloquees = nbDebloqueesParTree[id] ?? 0;
        const iconKey: string =
          id === TREE_GENERAL
            ? "general"
            : (meta.categorie as CategorieObjet | undefined) ?? "general";
        const Icon: LucideIcon = ICONS[iconKey] ?? Sparkles;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onSelect(id)}
            style={{
              ...cellBase,
              background: active ? "var(--forest-800)" : "var(--paper-100)",
              boxShadow: active
                ? "inset 0 0 0 2px var(--forest-800), inset 0 0 0 3px var(--brass-500)"
                : "none",
            }}
            title={meta.nom}
          >
            <Icon
              size={14}
              strokeWidth={1.5}
              color={active ? "var(--brass-300)" : "var(--forest-800)"}
            />
            <span
              style={{
                ...lvlText,
                color: active ? "var(--brass-300)" : "var(--brass-700)",
              }}
            >
              {nbDebloquees}/12
            </span>
          </button>
        );
      })}
    </div>
  );
}
