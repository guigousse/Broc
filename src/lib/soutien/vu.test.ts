// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  marquerNotationNiveauFaite,
  marquerPopupBorneVu,
  notationNiveauFaite,
  popupBorneVu,
} from "./vu";

beforeEach(() => {
  window.localStorage.clear();
});

describe("drapeaux de soutien", () => {
  it("le pop-up de la borne n'a pas été vu au premier lancement", () => {
    expect(popupBorneVu()).toBe(false);
  });

  it("une fois marqué, il reste vu", () => {
    marquerPopupBorneVu();
    expect(popupBorneVu()).toBe(true);
  });

  it("les deux drapeaux sont indépendants", () => {
    marquerPopupBorneVu();
    expect(notationNiveauFaite()).toBe(false);
    marquerNotationNiveauFaite();
    expect(notationNiveauFaite()).toBe(true);
  });
});

// Spec §3 : rouvrir le pop-up à chaque tap (onze fois de suite, dans son
// exemple) est le comportement à ne pas produire. Sans repli mémoire, un
// `localStorage` qui refuse d'écrire (quota, navigation privée, WebView
// capricieuse) ferait exactement ça, puisque `popupBorneVu()` resterait
// indéfiniment faux. Ces tests forcent l'échec d'écriture pour vérifier que
// le module s'en souvient quand même, au moins pour la session en cours.
// `vi.resetModules()` + import dynamique : chaque test a besoin d'un module
// « vierge », le drapeau mémoire vivant au niveau du module et non d'un état
// réinitialisable autrement.
describe("repli mémoire quand l'écriture disque échoue", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock("@/lib/storage/safeLocalStorage", () => ({
      safeLocalStorageGet: (_cle: string, repli: unknown) => repli,
      safeLocalStorageSet: () => false,
    }));
  });

  it("le pop-up de la borne ne se rouvre pas dans la même session si le disque refuse d'écrire", async () => {
    const { marquerPopupBorneVu: marquer, popupBorneVu: vu } = await import("./vu");
    expect(vu()).toBe(false);
    marquer();
    expect(vu()).toBe(true);
  });

  it("la notation de niveau ne se redemande pas dans la même session si le disque refuse d'écrire", async () => {
    const { marquerNotationNiveauFaite: marquer, notationNiveauFaite: faite } =
      await import("./vu");
    expect(faite()).toBe(false);
    marquer();
    expect(faite()).toBe(true);
  });

  it("les deux replis mémoire restent indépendants", async () => {
    const {
      marquerPopupBorneVu: marquerPopup,
      notationNiveauFaite: faite,
    } = await import("./vu");
    marquerPopup();
    expect(faite()).toBe(false);
  });
});
