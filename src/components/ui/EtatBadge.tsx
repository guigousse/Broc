import type { EtatObjet } from "@/types/game";

const STYLES: Record<EtatObjet, { label: string; bg: string; fg: string; bd: string }> = {
  Mauvais: {
    label: "· Mauvais",
    bg: "var(--paper-300)",
    fg: "var(--ink-500)",
    bd: "var(--ink-500)",
  },
  Bon: {
    label: "◆ Bon",
    bg: "var(--brass-300)",
    fg: "var(--forest-800)",
    bd: "var(--brass-700)",
  },
  "Très bon": {
    label: "◆◆ Très bon",
    bg: "var(--forest-800)",
    fg: "var(--brass-100)",
    bd: "var(--brass-500)",
  },
  "Pristin état": {
    label: "★★★ Pristin état",
    bg: "var(--brass-500)",
    fg: "var(--forest-900)",
    bd: "var(--brass-700)",
  },
};

export function EtatBadge({ etat }: { etat: EtatObjet }) {
  const s = STYLES[etat];
  return (
    <span
      style={{
        fontFamily: "var(--font-display)",
        fontSize: 8,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        fontWeight: 600,
        padding: "3px 7px",
        border: `1px solid ${s.bd}`,
        background: s.bg,
        color: s.fg,
        display: "inline-block",
        lineHeight: 1.1,
      }}
    >
      {s.label}
    </span>
  );
}
