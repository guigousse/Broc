// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const playPickup = vi.fn();
vi.mock("@/lib/audio/audioManager", () => ({
  audioManager: { playPickup: () => playPickup() },
}));

import { flyToTab } from "./flyAnimation";

function mockMatchMedia(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes("prefers-reduced-motion"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

const opts = () => ({
  fromRect: new DOMRect(10, 10, 40, 40),
  imageUrl: null,
  fallbackBg: "red",
  borderColor: "gold",
  targetSelector: '[data-fly-target="cible"]',
});

let cible: HTMLElement;
beforeEach(() => {
  vi.useFakeTimers();
  playPickup.mockClear();
  cible = document.createElement("div");
  cible.setAttribute("data-fly-target", "cible");
  document.body.appendChild(cible);
});
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("flyToTab — prefers-reduced-motion", () => {
  it("sans reduced-motion : un clone est ajouté puis retiré, pulsation + son à la fin", () => {
    mockMatchMedia(false);
    flyToTab(opts());
    expect(document.body.children.length).toBe(2);
    vi.advanceTimersByTime(620);
    expect(document.body.children.length).toBe(1);
    expect(cible.classList.contains("broc-pulse-once")).toBe(true);
    expect(playPickup).toHaveBeenCalledTimes(1);
  });

  it("avec reduced-motion : aucun clone, mais pulsation et son conservés (au tick suivant)", () => {
    mockMatchMedia(true);
    flyToTab(opts());
    // Aucun clone posé sur le body.
    expect(document.body.children.length).toBe(1);
    vi.runAllTimers();
    expect(document.body.children.length).toBe(1);
    expect(cible.classList.contains("broc-pulse-once")).toBe(false); // retirée après 650 ms
    expect(playPickup).toHaveBeenCalledTimes(1);
  });

  it("avec reduced-motion : le son est respecté (playSound: false → silence)", () => {
    mockMatchMedia(true);
    flyToTab({ ...opts(), playSound: false });
    vi.runAllTimers();
    expect(playPickup).not.toHaveBeenCalled();
  });
});
