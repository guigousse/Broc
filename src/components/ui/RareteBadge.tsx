import type { Rarete } from "@/types/game";

const STYLES: Record<Rarete, { label: string; fg: string; bd: string; bg: string }> = {
  commun: {
    label: "Commun",
    fg: "var(--ink-500)",
    bd: "var(--ink-300)",
    bg: "var(--paper-100)",
  },
  rare: {
    label: "Rare",
    fg: "var(--brass-700)",
    bd: "var(--brass-700)",
    bg: "var(--brass-100)",
  },
  legendaire: {
    label: "Légendaire",
    fg: "var(--paper-100)",
    bd: "var(--vermillion-600)",
    bg: "var(--vermillion-600)",
  },
};

export function RareteBadge({ rarete, size = "sm" }: { rarete: Rarete; size?: "sm" | "md" }) {
  const s = STYLES[rarete];
  const fontSize = size === "md" ? 10 : 8;
  return (
    <span
      title={`Rareté : ${s.label}`}
      style={{
        fontFamily: "var(--font-serif)",
        fontStyle: "italic",
        fontSize,
        letterSpacing: "0.05em",
        fontWeight: 500,
        padding: "2px 9px",
        border: `1px solid ${s.bd}`,
        borderRadius: 999,
        background: s.bg,
        color: s.fg,
        display: "inline-block",
        lineHeight: 1.2,
      }}
    >
      {s.label}
    </span>
  );
}
