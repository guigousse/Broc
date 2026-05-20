"use client";

import type { CSSProperties } from "react";
import type { CategorieObjet } from "@/types/game";

interface CategorieChipsProps {
  /** `null` = chip « Tous » sélectionné. */
  selection: CategorieObjet | null;
  onChange: (c: CategorieObjet | null) => void;
  comptesParCat: Partial<Record<CategorieObjet, number>>;
  total: number;
  categories: readonly CategorieObjet[];
}

const wrap: CSSProperties = {
  display: "flex",
  gap: 6,
  overflowX: "auto",
  paddingBottom: 2,
  WebkitOverflowScrolling: "touch",
};

const chip: CSSProperties = {
  flexShrink: 0,
  padding: "6px 10px",
  border: "1px solid var(--brass-500)",
  background: "var(--paper-100)",
  color: "var(--ink-500)",
  fontFamily: "var(--font-mono)",
  fontSize: 9.5,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  cursor: "pointer",
};

export function CategorieChips({
  selection,
  onChange,
  comptesParCat,
  total,
  categories,
}: CategorieChipsProps) {
  return (
    <div style={wrap}>
      <button
        type="button"
        onClick={() => onChange(null)}
        style={{
          ...chip,
          background:
            selection === null ? "var(--forest-800)" : "var(--paper-100)",
          color: selection === null ? "var(--brass-300)" : "var(--ink-500)",
        }}
      >
        Tous{" "}
        <strong
          style={{
            color: selection === null ? "var(--brass-300)" : "var(--brass-700)",
            fontFamily: "var(--font-display)",
          }}
        >
          {total}
        </strong>
      </button>
      {categories.map((c) => {
        const n = comptesParCat[c] ?? 0;
        const active = selection === c;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            style={{
              ...chip,
              background: active ? "var(--forest-800)" : "var(--paper-100)",
              color: active ? "var(--brass-300)" : "var(--ink-500)",
              opacity: n === 0 ? 0.45 : 1,
            }}
          >
            {c}{" "}
            <strong
              style={{
                color: active ? "var(--brass-300)" : "var(--brass-700)",
                fontFamily: "var(--font-display)",
              }}
            >
              {n}
            </strong>
          </button>
        );
      })}
    </div>
  );
}
