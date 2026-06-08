import type { NiveauCamion } from "@/types/game";

interface Props {
  niveau: NiveauCamion;
  size?: number;
}

export function CamionIcon({ niveau, size = 40 }: Props) {
  // SVG simple : carrosserie + 2 roues. Le niveau modifie la longueur du caisson.
  const boxLen = 24 + (niveau - 1) * 6; // 24 / 30 / 36 / 42
  return (
    <svg viewBox="0 0 60 36" width={size} height={(size * 36) / 60} aria-label={`Camion niveau ${niveau}`}>
      <rect x="4" y="6" width={boxLen} height="18" fill="var(--forest-800)" stroke="var(--ink-700)" strokeWidth="2" rx="2" />
      <rect x={boxLen + 4} y="12" width="14" height="12" fill="var(--brass-500)" stroke="var(--ink-700)" strokeWidth="2" />
      <circle cx="12" cy="28" r="4" fill="var(--ink-700)" />
      <circle cx={boxLen + 12} cy="28" r="4" fill="var(--ink-700)" />
    </svg>
  );
}
