import type { Rarete } from "@/types/game";

const STYLES: Record<Rarete, { label: string; bg: string; fg: string; bd: string }> = {
  commun: {
    label: "· Commun",
    bg: "var(--paper-300)",
    fg: "var(--ink-500)",
    bd: "var(--paper-500)",
  },
  rare: {
    label: "◆ Rare",
    bg: "var(--brass-300)",
    fg: "var(--forest-800)",
    bd: "var(--brass-700)",
  },
  legendaire: {
    label: "★★★ Légendaire",
    bg: "var(--vermillion-600)",
    fg: "var(--brass-100)",
    bd: "var(--brass-500)",
  },
};

export function RareteBadge({ rarete, size = "sm" }: { rarete: Rarete; size?: "sm" | "md" }) {
  const s = STYLES[rarete];
  const fontSize = size === "md" ? 11 : 9.5;
  return (
    <span
      style={{
        fontFamily: "var(--font-display)",
        fontSize,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        fontWeight: 600,
        padding: "3px 8px",
        border: `1px solid ${s.bd}`,
        background: s.bg,
        color: s.fg,
        display: "inline-block",
      }}
    >
      {s.label}
    </span>
  );
}
