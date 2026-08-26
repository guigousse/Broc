// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { INSTAGRAM_URL, TIKTOK_URL, lienNotation } from "./liens";

/** Simule le runtime : `tauri` absent = web, sinon iOS ou Android via l'UA. */
function plateforme(cible: "web" | "ios" | "android") {
  const UA = {
    web: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    ios: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    android: "Mozilla/5.0 (Linux; Android 14; Pixel 8)",
  }[cible];
  vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(UA);
  if (cible === "web") {
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
  } else {
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
  }
}

afterEach(() => {
  vi.restoreAllMocks();
  delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
});

describe("liens de soutien", () => {
  it("les réseaux sont les comptes @broc.le.jeu", () => {
    expect(INSTAGRAM_URL).toBe("https://instagram.com/broc.le.jeu");
    expect(TIKTOK_URL).toBe("https://tiktok.com/@broc.le.jeu");
  });

  it("sur iOS, la notation ouvre la fiche App Store en écriture d'avis", () => {
    plateforme("ios");
    expect(lienNotation()).toBe(
      "itms-apps://itunes.apple.com/app/id6784023113?action=write-review",
    );
  });

  it("sur le web, la notation passe en https (itms-apps n'existe pas)", () => {
    plateforme("web");
    expect(lienNotation()).toBe(
      "https://apps.apple.com/fr/app/broc-jeu-de-brocante/id6784023113",
    );
  });

  it("sur Android, aucune fiche tant que Broc n'est pas publié sur Play", () => {
    plateforme("android");
    expect(lienNotation()).toBeNull();
  });

  // Régression : le déploiement Vercel est aussi ouvert depuis des
  // téléphones Android (hors Tauri, donc `plateforme("web")` seul ne le
  // couvrait pas). Sans cette règle, ce cas retombait sur `APP_STORE_WEB` et
  // proposait de noter une application que ce joueur ne peut pas installer —
  // exactement le principe que `PLAY_STORE_ACTIF` existe pour éviter, mais
  // appliqué à moitié (seulement sous Tauri).
  it("sur Android WEB (site ouvert depuis un téléphone Android, hors Tauri), aucune fiche non plus", () => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Linux; Android 14; Pixel 8)",
    );
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
    expect(lienNotation()).toBeNull();
  });
});
