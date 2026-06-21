import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { localGameRepository } from "./localGameRepository";
import { createMockGameState } from "../__test-fixtures__/gameState";

const STORAGE_KEY = "projet-broc:game-state:v1";

/** Mock localStorage pour Node — Vitest tourne sans DOM par défaut. */
class MemoryStorage {
  private data = new Map<string, string>();
  getItem(k: string) {
    return this.data.has(k) ? this.data.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
  clear() {
    this.data.clear();
  }
}

beforeEach(() => {
  const storage = new MemoryStorage();
  vi.stubGlobal("window", { localStorage: storage });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("localGameRepository — load", () => {
  it("retourne null si rien n'est stocké", async () => {
    expect(await localGameRepository.load()).toBeNull();
  });

  it("retourne null si JSON invalide (corruption)", async () => {
    window.localStorage.setItem(STORAGE_KEY, "not-valid-json{");
    expect(await localGameRepository.load()).toBeNull();
  });

  it("retourne l'état parsé si JSON valide", async () => {
    const state = createMockGameState({ budget: 777 });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const loaded = await localGameRepository.load();
    expect(loaded?.budget).toBe(777);
  });
});

describe("localGameRepository — save", () => {
  it("écrit le state sérialisé sous la clé attendue", async () => {
    const state = createMockGameState({ budget: 42 });
    await localGameRepository.save(state);
    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).budget).toBe(42);
  });

  it("save puis load restitue l'état", async () => {
    const state = createMockGameState({ jourActuel: 17 });
    expect(await localGameRepository.save(state)).toBe(true);
    expect((await localGameRepository.load())?.jourActuel).toBe(17);
  });

  it("save écrase l'écriture précédente", async () => {
    await localGameRepository.save(createMockGameState({ budget: 1 }));
    await localGameRepository.save(createMockGameState({ budget: 2 }));
    expect((await localGameRepository.load())?.budget).toBe(2);
  });
});

describe("localGameRepository — clear", () => {
  it("supprime la clé du localStorage", async () => {
    await localGameRepository.save(createMockGameState());
    await localGameRepository.clear();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(await localGameRepository.load()).toBeNull();
  });
});

describe("localGameRepository — environnement sans window", () => {
  it("load() retourne null si window est undefined (SSR)", async () => {
    vi.stubGlobal("window", undefined);
    expect(await localGameRepository.load()).toBeNull();
  });

  it("save() ne plante pas si window est undefined (SSR)", async () => {
    vi.stubGlobal("window", undefined);
    await expect(
      localGameRepository.save(createMockGameState()),
    ).resolves.toBe(false);
  });

  it("clear() ne plante pas si window est undefined (SSR)", async () => {
    vi.stubGlobal("window", undefined);
    await expect(localGameRepository.clear()).resolves.toBeUndefined();
  });
});
