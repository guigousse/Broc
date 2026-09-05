import { audioManager } from "@/lib/audio/audioManager";
import { prefersReducedMotion } from "@/lib/transitionIris";

interface FlyOpts {
  /** Rect de l'élément source (thumb, image…). */
  fromRect: DOMRect;
  /** URL de l'image à animer. Si null, on utilise `fallbackBg`. */
  imageUrl: string | null;
  /** Fond de repli si pas d'image (dégradé / couleur). */
  fallbackBg: string;
  /** Couleur de bordure du clone. */
  borderColor: string;
  /**
   * Sélecteur CSS de l'élément cible du vol.
   * Ex: `[data-fly-target="stockage-bilan"]`, `"travaux"`, `"caisse-header"`.
   * Les cibles sont NOMMÉES, pas routées : l'ancien exemple `"/atelier"` ne
   * résolvait plus rien (l'Atelier n'a plus de colonne à lui depuis la fusion
   * des pièces dans la Réserve).
   */
  targetSelector: string;
  /** Durée du vol en ms. Défaut: 620. */
  duration?: number;
  /** Joue le son d'ajout à la fin. Défaut: true. */
  playSound?: boolean;
  /**
   * L'objet vole NU : ni fond, ni filet, ni ombre portée.
   *
   * Le cadre fait exister un vol de VIGNETTE — un carré coloré qui dit la
   * rareté. Mais les objets du catalogue sont détourés : posé derrière eux, ce
   * même cadre dessine un grand carré de laiton autour de l'objet (refusé à la
   * recette du 2026-08-26 sur l'achat au Bazar). L'image passe alors en
   * `contain` : sans cadre à remplir, `cover` rognerait les bords de l'objet.
   */
  sansCadre?: boolean;
  /**
   * Fait voler une COPIE de ce nœud (cloneNode profond) au lieu d'une image :
   * une carte Brocomon est composée (fond peint + textes), elle n'a pas
   * d'URL à elle. Le clone remplit la boîte du vol ; `imageUrl` est ignoré.
   */
  cloneDe?: HTMLElement;
}

const PULSE_CLASS = "broc-pulse-once";

/**
 * Anime un clone visuel d'un thumb (rect source) vers une icône cible
 * (sélecteur CSS), puis joue une pulsation sur la cible et un petit son
 * d'ajout. Si la cible n'existe pas dans le DOM, l'animation est sautée
 * (mais le son est joué pour le feedback).
 */
export function flyToTab(opts: FlyOpts): void {
  if (typeof document === "undefined") return;
  const duration = opts.duration ?? 620;

  const target = document.querySelector(opts.targetSelector) as HTMLElement | null;

  if (!target) {
    // Pas de cible visible : joue quand même le son pour le feedback.
    if (opts.playSound !== false) audioManager.playPickup();
    return;
  }

  // `prefers-reduced-motion` : pas de clone qui traverse l'écran. On garde
  // les effets attendus par les appelants (pulsation de la cible, son) et on
  // respecte la durée nominale : les cérémonies (bilan, livraison, colis…)
  // enchaînent leurs étapes sur cette durée, la raccourcir désynchroniserait
  // leur chorégraphie.
  if (prefersReducedMotion()) {
    window.setTimeout(() => arrivee(target, opts.playSound !== false), duration);
    return;
  }

  const toRect = target.getBoundingClientRect();

  const clone = document.createElement("div");
  const nu = opts.sansCadre === true;
  Object.assign(clone.style, {
    position: "fixed",
    left: `${opts.fromRect.left}px`,
    top: `${opts.fromRect.top}px`,
    width: `${opts.fromRect.width}px`,
    height: `${opts.fromRect.height}px`,
    ...(nu
      ? {}
      : {
          background: opts.fallbackBg,
          border: `1.5px solid ${opts.borderColor}`,
          boxShadow: "0 8px 18px rgba(0,0,0,0.35), 0 2px 4px rgba(0,0,0,0.25)",
        }),
    boxSizing: "border-box",
    zIndex: "9999",
    pointerEvents: "none",
    transition: `left ${duration}ms cubic-bezier(0.55, 0, 0.45, 1), top ${duration}ms cubic-bezier(0.45, 0, 0.55, 1), width ${duration}ms ease-in, height ${duration}ms ease-in, opacity ${duration}ms ease-in, transform ${duration}ms ease-in-out`,
  });

  if (opts.cloneDe) {
    const copie = opts.cloneDe.cloneNode(true) as HTMLElement;
    Object.assign(copie.style, { width: "100%", height: "100%", margin: "0" });
    clone.appendChild(copie);
  } else if (opts.imageUrl) {
    clone.style.backgroundImage = `url(${opts.imageUrl})`;
    clone.style.backgroundSize = nu ? "contain" : "cover";
    clone.style.backgroundPosition = "center";
    clone.style.backgroundRepeat = "no-repeat";
  }

  document.body.appendChild(clone);

  // Force layout puis lance la transition
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const targetSize = 18;
      const targetLeft = toRect.left + toRect.width / 2 - targetSize / 2;
      const targetTop = toRect.top + toRect.height / 2 - targetSize / 2;
      clone.style.left = `${targetLeft}px`;
      clone.style.top = `${targetTop}px`;
      clone.style.width = `${targetSize}px`;
      clone.style.height = `${targetSize}px`;
      clone.style.opacity = "0.4";
      clone.style.transform = "rotate(-12deg) scale(0.9)";
    });
  });

  window.setTimeout(() => {
    clone.remove();
    arrivee(target, opts.playSound !== false);
  }, duration);
}

/** Fin de vol : pulsation de la cible et son d'ajout. */
function arrivee(target: HTMLElement, son: boolean): void {
  target.classList.remove(PULSE_CLASS);
  // reflow pour redéclencher l'animation si déclenchée plusieurs fois
  void target.offsetWidth;
  target.classList.add(PULSE_CLASS);
  if (son) audioManager.playPickup();
  window.setTimeout(() => target.classList.remove(PULSE_CLASS), 650);
}
