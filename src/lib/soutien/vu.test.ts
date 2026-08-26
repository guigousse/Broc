// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
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
