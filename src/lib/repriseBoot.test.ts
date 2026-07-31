// @vitest-environment jsdom
/**
 * Le garde d'initialisation : la reprise n'est due que si le contexte JS a
 * DÉMARRÉ sur le menu (« / » ou « /index.html »). Un contexte né sur
 * /bureau (navigation dure de « Continuer » ou d'un lancement de slot) n'a
 * rien à reprendre — sans ce garde, l'écran-titre monté plus tard dans ce
 * contexte renverrait aussitôt au bureau et le menu serait inatteignable.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

async function importerAvecPathname(pathname: string) {
  window.history.replaceState(null, "", pathname);
  return import("./repriseBoot");
}

describe("repriseBoot — garde sur la route de démarrage", () => {
  it("contexte démarré sur « / » : reprise à traiter, puis consommée", async () => {
    const m = await importerAvecPathname("/");
    expect(m.doitTraiterReprise()).toBe(true);
    m.marquerRepriseTraitee();
    expect(m.doitTraiterReprise()).toBe(false);
  });

  it("contexte démarré sur « /index.html » (webview) : reprise à traiter", async () => {
    const m = await importerAvecPathname("/index.html");
    expect(m.doitTraiterReprise()).toBe(true);
  });

  it("contexte démarré sur /bureau : rien à reprendre", async () => {
    const m = await importerAvecPathname("/bureau");
    expect(m.doitTraiterReprise()).toBe(false);
  });

  it("contexte démarré sur /chiner : rien à reprendre", async () => {
    const m = await importerAvecPathname("/chiner");
    expect(m.doitTraiterReprise()).toBe(false);
  });
});
