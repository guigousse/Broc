/**
 * Repérage du conteneur défilant d'un élément.
 *
 * Le body du jeu est verrouillé (`position: fixed; overflow: hidden`, cf. le
 * « Verrou viewport (iOS WKWebView) » de globals.css) : la fenêtre ne défile
 * JAMAIS. Tout le défilement se passe dans un conteneur interne — le `<main>`
 * du MobileLayout, une sheet, un overlay. Un composant virtualisé doit donc
 * écouter CE conteneur : branché sur `window`, il resterait figé à l'offset 0
 * et ne monterait que les premières rangées (collection tronquée au scroll).
 */

const OVERFLOW_DEFILANT = new Set(["auto", "scroll", "overlay"]);

/** Premier ancêtre qui défile verticalement, `null` si aucun. */
export function trouverParentDefilant(el: HTMLElement): HTMLElement | null {
  let node = el.parentElement;
  while (node) {
    const { overflowY, overflow } = getComputedStyle(node);
    // Le raccourci `overflow` est aussi consulté : jsdom, contrairement aux
    // navigateurs, ne l'étend pas en `overflow-y` (qui y reste « visible »).
    if (OVERFLOW_DEFILANT.has(overflowY) || OVERFLOW_DEFILANT.has(overflow))
      return node;
    node = node.parentElement;
  }
  return null;
}

/**
 * Distance (px) entre le haut du contenu défilant de `parent` et le haut de
 * `el` — le `scrollMargin` attendu par @tanstack/react-virtual.
 *
 * Passe par la chaîne des `offsetParent` et non par `getBoundingClientRect` :
 * les offsets de mise en page sont invariants au défilement, alors qu'un rect
 * se décale à chaque scroll (et donnerait une marge qui dérive).
 */
export function decalageDansParentDefilant(
  el: HTMLElement,
  parent: HTMLElement,
): number {
  return offsetDepuisDocument(el) - offsetDepuisDocument(parent) - parent.clientTop;
}

function offsetDepuisDocument(el: HTMLElement): number {
  let top = 0;
  let node: HTMLElement | null = el;
  while (node) {
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return top;
}
