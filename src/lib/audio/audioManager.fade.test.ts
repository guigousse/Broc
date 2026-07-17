// @vitest-environment jsdom
/**
 * jsdom n'a pas de Web Audio : `ctx` reste undefined, on teste donc les
 * chemins dégradés (qui sont aussi ceux des tests de composants). Le
 * comportement de rampe réel relève de la vérif device.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { audioManager } from "./audioManager";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("audioManager — vinylEnLecture / fadeOutVinylBus", () => {
  it("vinylEnLecture : false quand aucun vinyle n'est chargé", () => {
    expect(audioManager.vinylEnLecture()).toBe(false);
  });

  it("fadeOutVinylBus sans contexte audio : arrêt immédiat, sans lever", () => {
    const stop = vi.spyOn(audioManager, "stopGramophone");
    expect(() => audioManager.fadeOutVinylBus(1800)).not.toThrow();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("fadeOutVinylBus est ré-appelable sans effet cumulatif", () => {
    const stop = vi.spyOn(audioManager, "stopGramophone");
    audioManager.fadeOutVinylBus(1800);
    audioManager.fadeOutVinylBus(300);
    expect(stop).toHaveBeenCalledTimes(2);
  });
});
