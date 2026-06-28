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
