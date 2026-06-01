import { audioManager } from "@/lib/audio/audioManager";

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
   * Sélecteur CSS de l'élément cible (icône TabBar).
   * Ex: `[data-fly-target="/atelier"]`
   */
  targetSelector: string;
  /** Durée du vol en ms. Défaut: 620. */
  duration?: number;
  /** Joue le son d'ajout à la fin. Défaut: true. */
  playSound?: boolean;
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
  const toRect = target.getBoundingClientRect();

  const clone = document.createElement("div");
  Object.assign(clone.style, {
    position: "fixed",
    left: `${opts.fromRect.left}px`,
    top: `${opts.fromRect.top}px`,
    width: `${opts.fromRect.width}px`,
    height: `${opts.fromRect.height}px`,
    background: opts.fallbackBg,
    border: `1.5px solid ${opts.borderColor}`,
    boxSizing: "border-box",
    zIndex: "9999",
    pointerEvents: "none",
    boxShadow: "0 8px 18px rgba(0,0,0,0.35), 0 2px 4px rgba(0,0,0,0.25)",
    transition: `left ${duration}ms cubic-bezier(0.55, 0, 0.45, 1), top ${duration}ms cubic-bezier(0.45, 0, 0.55, 1), width ${duration}ms ease-in, height ${duration}ms ease-in, opacity ${duration}ms ease-in, transform ${duration}ms ease-in-out`,
  });

  if (opts.imageUrl) {
    clone.style.backgroundImage = `url(${opts.imageUrl})`;
    clone.style.backgroundSize = "cover";
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
    target.classList.remove(PULSE_CLASS);
    // reflow pour redéclencher l'animation si déclenchée plusieurs fois
    void target.offsetWidth;
    target.classList.add(PULSE_CLASS);
    if (opts.playSound !== false) audioManager.playPickup();
    window.setTimeout(() => target.classList.remove(PULSE_CLASS), 650);
  }, duration);
}
