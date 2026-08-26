// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const openUrl = vi.fn((_url: string) => Promise.resolve());
vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: (url: string) => openUrl(url),
}));

import { ouvrirLien } from "./ouvrir";

beforeEach(() => {
  openUrl.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
  delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
});

describe("ouvrirLien", () => {
  it("sous Tauri, passe par le plugin", async () => {
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    await ouvrirLien("https://instagram.com/broc.le.jeu");
    expect(openUrl).toHaveBeenCalledWith("https://instagram.com/broc.le.jeu");
  });

  it("hors Tauri, ouvre un onglet et ne touche pas au plugin", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    await ouvrirLien("https://tiktok.com/@broc.le.jeu");
    expect(openUrl).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledWith(
      "https://tiktok.com/@broc.le.jeu",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("un plugin qui échoue ne remonte pas l'erreur à l'appelant", async () => {
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    openUrl.mockRejectedValueOnce(new Error("pas de navigateur"));
    await expect(ouvrirLien("itms-apps://x")).resolves.toBeUndefined();
  });
});
