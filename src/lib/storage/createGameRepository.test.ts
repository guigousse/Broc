import { describe, expect, it } from "vitest";
import { createGameRepository } from "./createGameRepository";
import { localGameRepository } from "./localGameRepository";

describe("createGameRepository", () => {
  it("retourne le repository local par défaut", () => {
    expect(createGameRepository()).toBe(localGameRepository);
  });

  it("retourne un objet implémentant l'interface GameRepository", () => {
    const repo = createGameRepository();
    expect(typeof repo.load).toBe("function");
    expect(typeof repo.save).toBe("function");
    expect(typeof repo.clear).toBe("function");
  });
});
