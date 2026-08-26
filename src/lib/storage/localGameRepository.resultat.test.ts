// @vitest-environment jsdom
/**
 * Tâche 3 : `save()` rend une cause qualifiée (`ResultatSave`) plutôt qu'un
 * booléen brut, pour que la tâche 8 puisse distinguer « disque plein » de
 * « stockage indisponible » dans l'escalade présentée au joueur.
 *
 * Fichier séparé de `localGameRepository.test.ts` (jsdom + `Storage.prototype`
 * réel) : ce dernier tourne en environnement node avec un `MemoryStorage`
 * maison stubé sur `window`, donc `vi.spyOn(Storage.prototype, "setItem")`
 * n'y patchamerait rien de ce que le code appelle réellement (cf. Ruling R2).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { localGameRepository } from "./localGameRepository";
import { createMockGameState } from "../__test-fixtures__/gameState";

beforeEach(() => {
  window.localStorage.clear();
});

describe("localGameRepository.save — ResultatSave", () => {
  it("rend { ok: true } quand l'écriture réussit", async () => {
    const r = await localGameRepository.save(createMockGameState());
    expect(r).toEqual({ ok: true });
  });

  it("rend le genre disque_plein quand le quota est dépassé", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      const e = new Error("quota");
      e.name = "QuotaExceededError";
      throw e;
    });
    const r = await localGameRepository.save(createMockGameState());
    expect(r).toEqual({ ok: false, genre: "disque_plein" });
  });
});
