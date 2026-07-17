// @vitest-environment jsdom
/**
 * Gestes du carrousel de chargement (retour device 2026-07-17) :
 * tap simple → onTap (ajout au centre) ; maintien OU tirer vertical →
 * drag (l'objet suit le doigt) ; glissé horizontal → scroll du carrousel.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { ItemEnCarrousel } from "./ItemEnCarrousel";
import type { Objet } from "@/types/game";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const objet = {
  id: "o1",
  templateId: "ma.lampe_petrole_ancienne",
  nom: "Lampe à pétrole ancienne",
  categorie: "Maison",
  etat: "Bon",
  rarete: "commun",
  prixReferenceReel: 30,
} as unknown as Objet;

function setup() {
  const onTap = vi.fn();
  const onDragStart = vi.fn();
  const onDragMove = vi.fn();
  const onDragEnd = vi.fn();
  const { container } = render(
    <ItemEnCarrousel
      objet={objet}
      onTap={onTap}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
    />,
  );
  const cell = container.firstElementChild as HTMLElement;
  return { cell, onTap, onDragStart, onDragMove, onDragEnd };
}

describe("ItemEnCarrousel — gestes", () => {
  it("tap simple → onTap (ajout automatique au centre)", () => {
    vi.useFakeTimers();
    const { cell, onTap, onDragStart } = setup();
    fireEvent.pointerDown(cell, { clientX: 100, clientY: 100, pointerId: 1 });
    vi.advanceTimersByTime(100); // sous HOLD_MS : pas encore un maintien
    fireEvent.pointerUp(cell, { clientX: 102, clientY: 101, pointerId: 1 });
    expect(onTap).toHaveBeenCalledWith("o1");
    expect(onDragStart).not.toHaveBeenCalled();
  });

  it("tirer vertical → le drag démarre, suit le doigt, puis dépose", () => {
    const { cell, onTap, onDragStart, onDragMove, onDragEnd } = setup();
    fireEvent.pointerDown(cell, { clientX: 100, clientY: 300, pointerId: 1 });
    fireEvent.pointerMove(cell, { clientX: 102, clientY: 280, pointerId: 1 });
    expect(onDragStart).toHaveBeenCalledWith("o1", 102, 280);
    fireEvent.pointerMove(cell, { clientX: 120, clientY: 200, pointerId: 1 });
    expect(onDragMove).toHaveBeenCalledWith(120, 200);
    fireEvent.pointerUp(cell, { clientX: 120, clientY: 200, pointerId: 1 });
    expect(onDragEnd).toHaveBeenCalledWith(120, 200);
    expect(onTap).not.toHaveBeenCalled();
  });

  it("maintien immobile (HOLD_MS) → le drag démarre sur place", () => {
    vi.useFakeTimers();
    const { cell, onDragStart } = setup();
    fireEvent.pointerDown(cell, { clientX: 100, clientY: 300, pointerId: 1 });
    vi.advanceTimersByTime(250);
    expect(onDragStart).toHaveBeenCalledWith("o1", 100, 300);
  });

  it("glissé horizontal franc → scroll du carrousel (ni drag ni tap)", () => {
    vi.useFakeTimers();
    const { cell, onTap, onDragStart } = setup();
    fireEvent.pointerDown(cell, { clientX: 100, clientY: 300, pointerId: 1 });
    fireEvent.pointerMove(cell, { clientX: 130, clientY: 302, pointerId: 1 });
    vi.advanceTimersByTime(400); // le hold ne doit PAS se déclencher
    fireEvent.pointerUp(cell, { clientX: 140, clientY: 302, pointerId: 1 });
    expect(onDragStart).not.toHaveBeenCalled();
    expect(onTap).not.toHaveBeenCalled();
  });
});
