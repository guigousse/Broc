// @vitest-environment jsdom
/**
 * Mesure des cibles du coach — recette device 2026-08-19, deux défauts
 * distincts visibles sur la même visite du stockage :
 *
 *  1. une cible sans boîte (`display: contents`) renvoie un rect 0×0 à
 *     l'origine ; le coach la prenait pour une cible LÉGITIME et collait sa
 *     bulle sous la barre d'état, découpe invisible dans le coin ;
 *  2. le coach mesurait au montage puis une seule frame plus tard, en plein
 *     milieu de l'animation d'entrée de 320 ms de FloatingRoomOverlay
 *     (translateY(-110%)) — la découpe restait figée sur un rect fantôme
 *     au-dessus de l'écran, et plus rien ne la rattrapait.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { TutorielCoach } from "./TutorielCoach";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** Pose un élément-cible dans le document et pilote son rect à la main. */
function poserCible(cible: string, rect: Partial<DOMRect>) {
  const el = document.createElement("div");
  el.setAttribute("data-tuto-coach", cible);
  document.body.appendChild(el);
  const boite = { top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0, ...rect };
  // Copie à chaque appel, comme le vrai DOM : le coach republie son rect à
  // chaque mesure, et React ne re-rendrait pas sur une référence identique.
  el.getBoundingClientRect = () => ({ ...boite }) as DOMRect;
  return {
    el,
    deplacer(suite: Partial<DOMRect>) {
      Object.assign(boite, suite);
    },
  };
}

function decoupe(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".coach-decoupe");
}

describe("TutorielCoach — cible sans boîte", () => {
  it("traite un rect 0×0 comme introuvable : voile plein, pas de découpe", () => {
    poserCible("sans-boite", { top: 0, left: 0, width: 0, height: 0 });
    render(
      <TutorielCoach etapes={[{ cible: "sans-boite", texte: "coucou" }]} onFini={() => {}} />,
    );
    expect(decoupe()).toBeNull();
  });

  it("découpe normalement une cible qui a une boîte", () => {
    poserCible("avec-boite", { top: 120, left: 20, width: 200, height: 40, bottom: 160 });
    render(
      <TutorielCoach etapes={[{ cible: "avec-boite", texte: "coucou" }]} onFini={() => {}} />,
    );
    const d = decoupe();
    expect(d).toBeTruthy();
    expect(d!.style.top).toBe("114px"); // 120 − 6 de marge
    expect(d!.style.width).toBe("212px"); // 200 + 12
  });
});

describe("TutorielCoach — cible encore en mouvement", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("rattrape la cible qui glisse pendant l'animation d'entrée", () => {
    const c = poserCible("bande", { top: -80, left: 12, width: 200, height: 40, bottom: -40 });
    render(<TutorielCoach etapes={[{ cible: "bande", texte: "coucou" }]} onFini={() => {}} />);
    // Première mesure : la bande est encore au-dessus de l'écran.
    expect(decoupe()!.style.top).toBe("-86px");

    // L'animation la dépose à sa place définitive…
    act(() => {
      c.deplacer({ top: 140, bottom: 180 });
      vi.advanceTimersByTime(400);
    });
    expect(decoupe()!.style.top).toBe("134px");
  });

  it("cesse de mesurer une fois la fenêtre de traque écoulée", () => {
    const c = poserCible("stable", { top: 100, left: 0, width: 50, height: 20, bottom: 120 });
    const espion = vi.spyOn(c.el, "getBoundingClientRect");
    render(<TutorielCoach etapes={[{ cible: "stable", texte: "coucou" }]} onFini={() => {}} />);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    const apresLaFenetre = espion.mock.calls.length;
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(espion.mock.calls.length).toBe(apresLaFenetre);
  });

  it("ne s'accroche jamais indéfiniment à une cible qui reste vide", () => {
    const c = poserCible("jamais", { top: 0, left: 0, width: 0, height: 0 });
    const espion = vi.spyOn(c.el, "getBoundingClientRect");
    render(<TutorielCoach etapes={[{ cible: "jamais", texte: "coucou" }]} onFini={() => {}} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    // La traque est bornée : sans cette borne, un élément absent ferait
    // tourner une boucle de mesure pour toute la durée de l'étape.
    expect(espion.mock.calls.length).toBeLessThan(30);
    expect(decoupe()).toBeNull();
  });
});
