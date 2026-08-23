import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...a: unknown[]) => invoke(...a) }));

describe("pontNatif", () => {
  beforeEach(() => {
    invoke.mockReset();
    vi.stubGlobal("window", { __TAURI_INTERNALS__: {} });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("traduit le numéro de slot en cible du plugin", async () => {
    const { quoiDuSlot } = await import("./pontNatif");
    expect(quoiDuSlot(1)).toBe("slot_1");
    expect(quoiDuSlot(3)).toBe("slot_3");
  });

  it("rend null pour un fichier absent", async () => {
    invoke.mockResolvedValue(null);
    const { lireSave } = await import("./pontNatif");
    await expect(lireSave("slot_1")).resolves.toBeNull();
  });

  it("rejette avec une ErreurStockage discriminée quand le disque est plein", async () => {
    invoke.mockRejectedValue({ genre: "disque_plein", message: "Disque plein" });
    const { ecrireSave } = await import("./pontNatif");
    await expect(ecrireSave("slot_1", "{}")).rejects.toMatchObject({
      genre: "disque_plein",
    });
  });

  it("rejette en « indisponible » hors Tauri, sans appeler invoke", async () => {
    vi.stubGlobal("window", {});
    const { ecrireSave } = await import("./pontNatif");
    await expect(ecrireSave("slot_1", "{}")).rejects.toMatchObject({
      genre: "indisponible",
    });
    expect(invoke).not.toHaveBeenCalled();
  });

  it("normalise une erreur non conforme en genre io", async () => {
    invoke.mockRejectedValue("boum");
    const { ecrireSave } = await import("./pontNatif");
    await expect(ecrireSave("slot_1", "{}")).rejects.toMatchObject({ genre: "io" });
  });
});
