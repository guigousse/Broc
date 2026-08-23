import { afterEach, describe, expect, it, vi } from "vitest";

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

// Ruling R12 — revue post-tâche 7 : `GameContext.tsx` appelait
// `createGameRepository()` une seule fois, à l'évaluation du module. Avant
// le cutover, la réponse était une constante ; depuis, elle dépend de
// `__TAURI_INTERNALS__` déjà injecté au moment de cette évaluation — pas
// garanti. `obtenirGameRepository()` retarde la décision jusqu'au premier
// usage réel ET la mémoïse, pour qu'un changement de détection APRÈS ce
// premier appel ne fasse plus basculer l'implémentation en cours de
// session (ce que `createGameRepository()`, resté pur, ferait sans
// mémoïsation).
describe("obtenirGameRepository — mémoïsation (Ruling R12)", () => {
  it("mémoïse la décision au premier appel : Tauri détecté ensuite ne fait plus basculer l'implémentation", async () => {
    vi.resetModules();
    (globalThis as { window?: unknown }).window = {}; // navigateur au premier appel
    const { obtenirGameRepository } = await import("./createGameRepository");
    const { localGameRepository } = await import("./localGameRepository");
    const { fichierGameRepository } = await import("./fichierGameRepository");

    expect(obtenirGameRepository()).toBe(localGameRepository);

    (globalThis as { window?: unknown }).window = { __TAURI_INTERNALS__: {} };

    expect(obtenirGameRepository()).toBe(localGameRepository);
    expect(obtenirGameRepository()).not.toBe(fichierGameRepository);
  });

  it("retient le composite si Tauri était déjà détecté au premier appel", async () => {
    vi.resetModules();
    (globalThis as { window?: unknown }).window = { __TAURI_INTERNALS__: {} };
    const { obtenirGameRepository } = await import("./createGameRepository");
    const { fichierGameRepository } = await import("./fichierGameRepository");

    expect(obtenirGameRepository()).toBe(fichierGameRepository);
  });

  it("createGameRepository() reste pur : deux appels directs reflètent chacun l'état courant, sans mémoïsation", async () => {
    vi.resetModules();
    (globalThis as { window?: unknown }).window = {};
    const { createGameRepository } = await import("./createGameRepository");
    const { localGameRepository } = await import("./localGameRepository");
    const { fichierGameRepository } = await import("./fichierGameRepository");

    expect(createGameRepository()).toBe(localGameRepository);
    (globalThis as { window?: unknown }).window = { __TAURI_INTERNALS__: {} };
    expect(createGameRepository()).toBe(fichierGameRepository);
  });
});
