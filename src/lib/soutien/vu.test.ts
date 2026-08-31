// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { marquerNotationNiveauFaite, notationNiveauFaite } from "./vu";

beforeEach(() => {
  window.localStorage.clear();
});

describe("drapeau de soutien", () => {
  it("la notation n'a pas été demandée au premier lancement", () => {
    expect(notationNiveauFaite()).toBe(false);
  });

  it("une fois marquée, elle reste faite", () => {
    marquerNotationNiveauFaite();
    expect(notationNiveauFaite()).toBe(true);
  });
});

// Sans repli mémoire, un `localStorage` qui refuse d'écrire (quota, navigation
// privée, WebView capricieuse) ferait redemander la notation à chaque niveau
// 10 de la session, `notationNiveauFaite()` restant indéfiniment faux. Ce test
// force l'échec d'écriture pour vérifier que le module s'en souvient quand
// même. `vi.resetModules()` + import dynamique : le drapeau mémoire vit au
// niveau du module, il faut un module vierge pour l'observer.
describe("repli mémoire quand l'écriture disque échoue", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock("@/lib/storage/safeLocalStorage", () => ({
      safeLocalStorageGet: (_cle: string, repli: unknown) => repli,
      safeLocalStorageSet: () => false,
    }));
  });

  it("la notation de niveau ne se redemande pas dans la même session si le disque refuse d'écrire", async () => {
    const { marquerNotationNiveauFaite: marquer, notationNiveauFaite: faite } =
      await import("./vu");
    expect(faite()).toBe(false);
    marquer();
    expect(faite()).toBe(true);
  });
});
