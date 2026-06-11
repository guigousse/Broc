import { describe, expect, it } from "vitest";
import { createMemoryGameRepository } from "./memoryGameRepository";
import { createMockGameState } from "../__test-fixtures__/gameState";

describe("createMemoryGameRepository", () => {
  it("load() retourne null sur un repository vide", async () => {
    const repo = createMemoryGameRepository();
    expect(await repo.load()).toBeNull();
  });

  it("load() retourne l'état initial passé en argument", async () => {
    const initial = createMockGameState({ budget: 500 });
    const repo = createMemoryGameRepository(initial);
    const loaded = await repo.load();
    expect(loaded?.budget).toBe(500);
  });

  it("save() puis load() restitue l'état", async () => {
    const repo = createMemoryGameRepository();
    const state = createMockGameState({ budget: 1234 });
    await repo.save(state);
    expect((await repo.load())?.budget).toBe(1234);
  });

  it("save() écrase l'état précédent", async () => {
    const repo = createMemoryGameRepository(createMockGameState({ budget: 1 }));
    await repo.save(createMockGameState({ budget: 2 }));
    expect((await repo.load())?.budget).toBe(2);
  });

  it("clear() remet le repository à null", async () => {
    const repo = createMemoryGameRepository(createMockGameState());
    await repo.clear();
    expect(await repo.load()).toBeNull();
  });

  it("chaque factory crée une instance isolée (pas de state partagé)", async () => {
    const repoA = createMemoryGameRepository(createMockGameState({ budget: 100 }));
    const repoB = createMemoryGameRepository();
    await repoB.save(createMockGameState({ budget: 999 }));
    expect((await repoA.load())?.budget).toBe(100);
    expect((await repoB.load())?.budget).toBe(999);
  });
});
