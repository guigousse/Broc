/**
 * Setup global des tests.
 *
 * jsdom n'implémente pas `ResizeObserver`, dont dépend `measureElement` de
 * `@tanstack/react-virtual` (virtualisation de la grille de collection). On
 * fournit un stub no-op : en jsdom il n'y a de toute façon pas de layout réel,
 * la virtualisation rend alors toutes les rangées (ce que les tests attendent).
 */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;
}

/**
 * jsdom n'implémente pas `Element.prototype.scrollTo` (seulement
 * `window.scrollTo`). Plusieurs composants remettent une zone défilante à
 * zéro au montage (ex. `BilanSession`) : on fournit un stub no-op pour que
 * l'appel ne jette pas en environnement de test, où il n'y a de toute façon
 * pas de layout réel à faire défiler.
 */
if (typeof Element !== "undefined" && !Element.prototype.scrollTo) {
  Element.prototype.scrollTo = function scrollTo() {};
}

/**
 * jsdom n'implémente pas non plus `Element.prototype.scrollIntoView`.
 * `UnifiedPanorama` l'appelle au montage pour centrer la zone cible ; sans
 * stub, tout rendu direct du composant lève en environnement de test.
 */
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}
