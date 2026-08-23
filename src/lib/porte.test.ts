import { describe, expect, it } from "vitest";
import { destinationChiner, destinationEtaler } from "./porte";
import { VITRINE_PREP_ID } from "./vitrinePrep";
import type { EtatPorte } from "./porte";

const MAINTENANT = 1_700_000_000_000;

function etat(energie: number, vitrine: EtatPorte["vitrine"] = null): EtatPorte {
  return { energie, energieDerniereMaj: MAINTENANT, vitrine };
}

/** Une vitrine attachée à une vraie brocante : la journée a commencé. */
function journee(brocanteId: string) {
  return { brocanteId } as EtatPorte["vitrine"];
}

describe("destinationChiner", () => {
  it("mène au chinage quand il reste de l'énergie", () => {
    expect(destinationChiner(etat(3), MAINTENANT)).toEqual({
      type: "route",
      href: "/chiner",
    });
  });

  it("réclame de l'énergie quand la jauge est vide", () => {
    expect(destinationChiner(etat(0), MAINTENANT)).toEqual({ type: "energieInsuffisante" });
  });
});

describe("destinationEtaler", () => {
  it("sans vitrine, mène à la préparation", () => {
    expect(destinationEtaler(etat(3), MAINTENANT)).toEqual({
      type: "route",
      href: "/vitrine/prep",
    });
  });

  it("vitrine en préparation, mène à la préparation", () => {
    expect(destinationEtaler(etat(3, journee(VITRINE_PREP_ID)), MAINTENANT)).toEqual({
      type: "route",
      href: "/vitrine/prep",
    });
  });

  /**
   * Une journée déjà commencée a DÉJÀ consommé son énergie : la reprendre ne
   * se paie pas une seconde fois. C'est pourquoi la vitrine se teste AVANT la
   * jauge — un joueur à zéro qui a une brocante en cours doit pouvoir y
   * retourner, sinon sa journée reste prisonnière de la machine à énergie.
   */
  it("journée commencée, y retourne même la jauge à zéro", () => {
    expect(destinationEtaler(etat(0, journee("broc-42")), MAINTENANT)).toEqual({
      type: "route",
      href: "/vitrine/broc-42/journee",
    });
  });

  it("sans journée en cours et sans énergie, réclame de l'énergie", () => {
    expect(destinationEtaler(etat(0), MAINTENANT)).toEqual({ type: "energieInsuffisante" });
  });
});
