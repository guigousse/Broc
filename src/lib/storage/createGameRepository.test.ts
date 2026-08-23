import { afterEach, describe, expect, it } from "vitest";

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

describe("createGameRepository", () => {
  it("choisit le composite sous Tauri", async () => {
    (globalThis as { window?: unknown }).window = { __TAURI_INTERNALS__: {} };
    const { createGameRepository } = await import("./createGameRepository");
    const { fichierGameRepository } = await import("./fichierGameRepository");
    expect(createGameRepository()).toBe(fichierGameRepository);
  });

  it("reste sur le local dans un navigateur", async () => {
    (globalThis as { window?: unknown }).window = {};
    const { createGameRepository } = await import("./createGameRepository");
    const { localGameRepository } = await import("./localGameRepository");
    expect(createGameRepository()).toBe(localGameRepository);
  });

  it("retourne un objet implémentant l'interface GameRepository", async () => {
    (globalThis as { window?: unknown }).window = {};
    const { createGameRepository } = await import("./createGameRepository");
    const repo = createGameRepository();
    expect(typeof repo.load).toBe("function");
    expect(typeof repo.save).toBe("function");
    expect(typeof repo.clear).toBe("function");
  });
});
