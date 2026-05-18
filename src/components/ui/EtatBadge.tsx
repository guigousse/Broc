import type { EtatObjet } from "@/types/game";

const STYLES: Record<EtatObjet, { label: string; bg: string; fg: string; bd: string }> = {
  Mauvais: {
    label: "·",
    bg: "var(--paper-300)",
    fg: "var(--ink-500)",
    bd: "var(--ink-500)",
  },
  Bon: {
    label: "◆",
    bg: "var(--brass-300)",
    fg: "var(--forest-800)",
    bd: "var(--brass-700)",
  },
  "Très bon": {
    label: "◆◆",
    bg: "var(--forest-800)",
    fg: "var(--brass-100)",
    bd: "var(--brass-500)",
  },
  "Pristin état": {
    label: "★★★",
    bg: "var(--brass-500)",
    fg: "var(--forest-900)",
    bd: "var(--brass-700)",
  },
};

export function EtatBadge({ etat }: { etat: EtatObjet }) {
  const s = STYLES[etat];
  return (
    <span
      title={etat}
      style={{
        fontFamily: "var(--font-display)",
        fontSize: 11,
        letterSpacing: "0.12em",
        fontWeight: 700,
        padding: "4px 9px",
        border: `1px solid ${s.bd}`,
        background: s.bg,
        color: s.fg,
        display: "inline-block",
        lineHeight: 1,
      }}
    >
      {s.label}
    </span>
  );
}
