"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleCategorie } from "@/lib/i18n/libelles";
import type { CategorieObjet } from "@/types/game";
import { CategorieIcon } from "./CategorieIcon";

interface CategorieAccordionProps {
  categorie: CategorieObjet;
  compte: number;
  /** Texte optionnel à droite du compteur (ex: total €). */
  meta?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function CategorieAccordion({
  categorie,
  compte,
  meta,
  defaultOpen = true,
  children,
}: CategorieAccordionProps) {
  const { d } = useLangue();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section
      style={{
        border: "1px solid var(--brass-700)",
        background: open ? "transparent" : "rgba(234,224,203,0.3)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          width: "100%",
          padding: "10px 14px",
          background: open ? "var(--paper-100)" : "transparent",
          border: "none",
          borderBottom: open ? "1px solid var(--brass-700)" : "none",
          cursor: "pointer",
          fontFamily: "inherit",
          color: "inherit",
          textAlign: "left",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            border: "1px solid var(--brass-700)",
            background: "var(--paper-200)",
            color: "var(--brass-700)",
          }}
        >
          <CategorieIcon categorie={categorie} size={16} />
        </span>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--forest-800)",
            flex: 1,
          }}
        >
          {libelleCategorie(categorie, d)}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--brass-700)",
          }}
        >
          {compte} obj.
        </span>
        {meta && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.12em",
              color: "var(--ink-500)",
            }}
          >
            {meta}
          </span>
        )}
        <ChevronDown
          size={16}
          color="var(--brass-700)"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 180ms ease",
          }}
        />
      </button>
      {open && <div style={{ padding: 14 }}>{children}</div>}
    </section>
  );
}
