import type { Meteo } from "@/types/game";
import {
  Cloud,
  CloudLightning,
  CloudRain,
  Sun,
  type LucideIcon,
} from "lucide-react";

export const METEOS: Meteo[] = ["ensoleille", "nuageux", "pluvieux", "orageux"];

export const METEO_LABEL: Record<Meteo, string> = {
  ensoleille: "Ensoleillé",
  nuageux: "Nuageux",
  pluvieux: "Pluvieux",
  orageux: "Orageux",
};

export const METEO_ICON: Record<Meteo, LucideIcon> = {
  ensoleille: Sun,
  nuageux: Cloud,
  pluvieux: CloudRain,
  orageux: CloudLightning,
};

/**
 * Multiplicateur sur l'intervalle entre clients au stand de vente.
 * < 1 → plus de clients (beau temps), > 1 → moins de clients (mauvais temps).
 */
export const METEO_INTERVALLE_MULT: Record<Meteo, number> = {
  ensoleille: 0.85,
  nuageux: 1.0,
  pluvieux: 1.2,
  orageux: 1.5,
};

/** Probabilités de tirage par météo (somme = 1). */
export const METEO_PROBA: Array<[Meteo, number]> = [
  ["ensoleille", 0.4],
  ["nuageux", 0.3],
  ["pluvieux", 0.2],
  ["orageux", 0.1],
];

export function descriptionEffetMeteo(meteo: Meteo): string {
  const mult = METEO_INTERVALLE_MULT[meteo];
  if (mult < 0.95) return "Affluence accrue (clients +15 %).";
  if (mult > 1.35) return "Affluence très réduite (clients −33 %).";
  if (mult > 1.1) return "Affluence réduite (clients −17 %).";
  return "Affluence normale.";
}
