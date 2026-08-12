/**
 * Zones sûres mesurées côté natif sur Android.
 *
 * La WebView Android ne renseigne pas `env(safe-area-inset-*)` de façon fiable.
 * Constaté sur émulateur le 2026-08-12, sur un seul et même APK : l'inset du
 * haut valait 49 px à un moment, 0 px un quart d'heure plus tard, sans qu'on
 * revienne jamais à 49 — le header passait alors sous la barre d'état (heure et
 * Wi-Fi par-dessus le logo, `LEVEL` sous le poinçon de la caméra). L'inset du
 * bas, lui, vaut 0 en permanence alors que la barre de gestes occupe 24 px CSS
 * (48 px en mode trois boutons).
 *
 * `MainActivity.kt` expose donc `window.BrocInsets`, adossé à
 * `WindowInsetsCompat` : le système, lui, donne les deux bords sans hésiter.
 * C'est le front qui interroge, jamais le natif qui pousse — les insets sont
 * appliqués avant que le document existe, une écriture depuis Kotlin serait
 * perdue au chargement de la page.
 */

/** Au-delà, on tient la mesure pour aberrante : aucune barre système ne fait ça. */
const PLAFOND_PX = 120;

interface PontInsets {
  hautPx: () => number;
  basPx: () => number;
}

export interface ZonesSures {
  /** Hauteur à réserver en haut (barre d'état, poinçon de caméra), en px CSS. */
  haut: number;
  /** Hauteur à réserver en bas (barre de gestes ou trois boutons), en px CSS. */
  bas: number;
}

function mesureValide(valeur: unknown): valeur is number {
  return (
    typeof valeur === "number" &&
    Number.isFinite(valeur) &&
    valeur >= 0 &&
    valeur <= PLAFOND_PX
  );
}

/**
 * Zones sûres mesurées par Android, ou `null` hors Android — et aussi dès que
 * le pont répond n'importe quoi. Le repli est alors `env()`, qui vaut au pire
 * 0 : mieux vaut le défaut d'aujourd'hui qu'un bandeau fantaisiste.
 */
export function zonesSuresNatives(): ZonesSures | null {
  if (typeof window === "undefined") return null;
  const pont = (window as unknown as { BrocInsets?: Partial<PontInsets> }).BrocInsets;
  if (!pont || typeof pont.hautPx !== "function" || typeof pont.basPx !== "function") {
    return null;
  }

  let haut: unknown;
  let bas: unknown;
  try {
    haut = pont.hautPx();
    bas = pont.basPx();
  } catch {
    return null;
  }

  if (!mesureValide(haut) || !mesureValide(bas)) return null;
  // Android rend des flottants (48.761905670166016 pour la barre d'état de
  // l'émulateur). On arrondit vers le haut : mieux vaut un pixel de trop que la
  // barre système qui mord sur le header.
  return { haut: Math.ceil(haut), bas: Math.ceil(bas) };
}
