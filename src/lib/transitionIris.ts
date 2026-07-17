/**
 * Transition « iris » entre le menu titre et le bureau — spec
 * docs/superpowers/specs/2026-07-17-transition-iris-design.md.
 *
 * Le flag sessionStorage fait traverser la navigation (rechargement dur de
 * « Continuer »/« Lancer », ou router.push de la nouvelle partie) à
 * l'information « jouer la réouverture d'iris à l'arrivée » ; il est
 * consommé côté bureau (IrisArrivee). sessionStorage et pas localStorage :
 * la transition ne doit jamais survivre à un kill de l'appli.
 *
 * ⚠ La clé FLAG_KEY est dupliquée EN DUR dans le script preboot du layout
 * racine (src/app/layout.tsx) — garder les deux synchronisées.
 */

export const DUREE_FERMETURE_MS = 900;
export const DUREE_OUVERTURE_MS = 700;
export const NOIR_MIN_MS = 250;
export const TIMEOUT_PRECHARGEMENT_MS = 4000;
export const DUREE_FADE_REDUIT_MS = 400;

/**
 * Centre mesuré de la porte d'entrée sur `facade-accueil.webp` (rectangle
 * brun sombre ~190×470 px, mesure sharp .extract + .stats() — cf. l'ancienne
 * doc d'IntroPorte) : cx ≈ 51 %, cy ≈ 66 % de l'image.
 */
export const PORTE_CX_PCT = 51;
export const PORTE_CY_PCT = 66;

const FLAG_KEY = "broc.transition-iris";

export function poserFlagIris(): void {
  try {
    window.sessionStorage.setItem(FLAG_KEY, "1");
  } catch {
    // Storage indisponible : l'arrivée se fera sans iris, sans casser le jeu.
  }
}

export function lireFlagIris(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

export function effacerFlagIris(): void {
  try {
    window.sessionStorage.removeItem(FLAG_KEY);
  } catch {
    // Si le storage est HS, le flag n'a jamais pu être posé : rien à faire.
  }
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Point écran (px viewport) du centre de la porte pour un élément rendu en
 * `object-fit: cover` avec `object-position: 51% 66%` : par définition du
 * pourcentage d'object-position, le point à 51 %/66 % de l'IMAGE coïncide
 * avec le point à 51 %/66 % de la BOÎTE de l'élément — y compris à travers
 * les transforms (scale/translate de parallaxe), que getBoundingClientRect
 * intègre. Fallback : centre de l'écran si l'élément n'est pas mesurable.
 */
export function pointPorteEcran(el: HTMLElement | null): { x: number; y: number } {
  if (el) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      return {
        x: r.left + (r.width * PORTE_CX_PCT) / 100,
        y: r.top + (r.height * PORTE_CY_PCT) / 100,
      };
    }
  }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

/**
 * Précharge et décode une image, sans jamais rejeter : résout quand l'image
 * est prête à peindre, sur erreur de chargement, ou au timeout (image lente,
 * decode() absent) — l'appelant ne doit jamais rester bloqué au noir.
 */
export function prechargerImage(
  src: string,
  timeoutMs = TIMEOUT_PRECHARGEMENT_MS,
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || typeof Image === "undefined") {
      resolve();
      return;
    }
    let fini = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const terminer = () => {
      if (fini) return;
      fini = true;
      if (timer !== undefined) clearTimeout(timer);
      resolve();
    };
    timer = setTimeout(terminer, timeoutMs);
    const img = new Image();
    img.onerror = terminer;
    img.onload = () => {
      // decode() garantit l'image décodée (prête à peindre), pas seulement
      // téléchargée ; absent ou en échec, onload est la meilleure approximation.
      if (typeof img.decode === "function") {
        img.decode().then(terminer, terminer);
      } else {
        terminer();
      }
    };
    img.src = src;
  });
}
