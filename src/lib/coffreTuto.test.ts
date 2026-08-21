import { describe, expect, it } from "vitest";
import { estSurTrace, prixPoses, traceActive, traceAPoser, tracesToutesPosees } from "./coffreTuto";
import { PRIX_CONSEILLES_TUTORIEL, TRACES_TUTORIEL } from "@/data/tutorielScenario";

const t0 = TRACES_TUTORIEL[0]; // manette, rotation 25 (v3 : pivotée, démo du grand-père)
const t1 = TRACES_TUTORIEL[1]; // carafe, rotation 40

describe("traceActive", () => {
  it("mappe les deux étapes du coffre", () => {
    expect(traceActive("coffre-trace-un")).toBe(t0);
    expect(traceActive("coffre-trace-deux")).toBe(t1);
    expect(traceActive("preparer-etal")).toBeNull();
  });
});

describe("estSurTrace", () => {
  it("accepte dans les tolérances (distance ET angle)", () => {
    expect(estSurTrace({ posX: t0.posX + 0.05, posY: t0.posY, rotation: t0.rotation + 8 }, t0)).toBe(true);
    expect(estSurTrace({ posX: t1.posX, posY: t1.posY - 0.04, rotation: 47 }, t1)).toBe(true);
  });
  it("refuse hors distance ou hors angle", () => {
    expect(estSurTrace({ posX: t0.posX + 0.12, posY: t0.posY, rotation: t0.rotation }, t0)).toBe(false);
    expect(estSurTrace({ posX: t1.posX, posY: t1.posY, rotation: 90 }, t1)).toBe(false);
  });
  it("gère le tour complet (377° ≈ trace −8°, via un tour au-delà de 360°) et les champs absents", () => {
    expect(estSurTrace({ posX: t0.posX, posY: t0.posY, rotation: t0.rotation + 352 }, t0)).toBe(true);
    expect(estSurTrace({ rotation: undefined, posX: undefined, posY: undefined }, t0)).toBe(false);
  });
  it("wrap-around à trace 0° (branche 360 - brut, inatteignable via les traces réelles 25°/40°)", () => {
    const traceZero = { templateId: "test", posX: 0.5, posY: 0.5, rotation: 0 };
    // brut = 352, 360 - brut = 8 ≤ 10 : accepté via le wrap.
    expect(estSurTrace({ posX: 0.5, posY: 0.5, rotation: 352 }, traceZero)).toBe(true);
    // brut = 348, 360 - brut = 12 > 10 : refusé.
    expect(estSurTrace({ posX: 0.5, posY: 0.5, rotation: 348 }, traceZero)).toBe(false);
  });
});

describe("tracesToutesPosees", () => {
  const ovManette = { objet: { templateId: "jx.manette_vibraduo" }, posX: t0.posX, posY: t0.posY, rotation: t0.rotation };
  const ovCarafe = { objet: { templateId: "ma.carafe_cristal_taille" }, posX: t1.posX, posY: t1.posY, rotation: 40 };
  it("étape un : la trace 1 posée suffit", () => {
    expect(tracesToutesPosees("coffre-trace-un", [ovManette] as never)).toBe(true);
    expect(tracesToutesPosees("coffre-trace-un", [] as never)).toBe(false);
  });
  it("étape deux : les DEUX traces doivent être posées", () => {
    expect(tracesToutesPosees("coffre-trace-deux", [ovManette, ovCarafe] as never)).toBe(true);
    expect(tracesToutesPosees("coffre-trace-deux", [ovManette] as never)).toBe(false);
    expect(tracesToutesPosees("coffre-trace-deux", [ovManette, { ...ovCarafe, rotation: 0 }] as never)).toBe(false);
  });
  it("hors étapes coffre : vrai (ne bloque jamais Valider)", () => {
    expect(tracesToutesPosees("termine", [] as never)).toBe(true);
  });
});

describe("traceAPoser", () => {
  const ovManette = { objet: { templateId: "jx.manette_vibraduo" }, posX: t0.posX, posY: t0.posY, rotation: t0.rotation };
  const ovCarafe = { objet: { templateId: "ma.carafe_cristal_taille" }, posX: t1.posX, posY: t1.posY, rotation: 40 };

  it("étape un : la trace 1 tant qu'elle n'est pas posée, sinon null", () => {
    expect(traceAPoser("coffre-trace-un", [] as never)).toBe(t0);
    expect(traceAPoser("coffre-trace-un", [ovManette] as never)).toBeNull();
  });

  it("étape deux : retombe sur la trace 1 si elle n'est plus posée (délogée)", () => {
    // Manette absente/délogée malgré l'étape déjà avancée à coffre-trace-deux.
    expect(traceAPoser("coffre-trace-deux", [] as never)).toBe(t0);
    expect(traceAPoser("coffre-trace-deux", [{ ...ovManette, posX: 0.85, posY: 0.85 }] as never)).toBe(t0);
  });

  it("étape deux : la trace 2 quand la trace 1 est posée mais pas la 2", () => {
    expect(traceAPoser("coffre-trace-deux", [ovManette] as never)).toBe(t1);
  });

  it("étape deux : null quand les deux traces sont posées", () => {
    expect(traceAPoser("coffre-trace-deux", [ovManette, ovCarafe] as never)).toBeNull();
  });

  it("hors étapes coffre : null", () => {
    expect(traceAPoser("preparer-etal", [] as never)).toBeNull();
    expect(traceAPoser("termine", [] as never)).toBeNull();
  });
});

describe("prixPoses", () => {
  const manette = (prix: number) => ({ objet: { templateId: "jx.manette_vibraduo" }, prixVente: prix }) as never;
  const carafe = (prix: number) => ({ objet: { templateId: "ma.carafe_cristal_taille" }, prixVente: prix }) as never;
  const autre = { objet: { templateId: "mus.ukulele_soprano" }, prixVente: 24 } as never;
  it("vrai quand manette et carafe sont au prix conseillé (les autres objets sont ignorés)", () => {
    expect(prixPoses([manette(PRIX_CONSEILLES_TUTORIEL["jx.manette_vibraduo"]), carafe(PRIX_CONSEILLES_TUTORIEL["ma.carafe_cristal_taille"]), autre])).toBe(true);
  });
  it("faux si un prix conseillé n'est pas posé", () => {
    expect(prixPoses([manette(PRIX_CONSEILLES_TUTORIEL["jx.manette_vibraduo"]), carafe(99), autre])).toBe(false);
  });
  it("vrai sur un coffre sans objets conseillés (fail-open hors tuto)", () => {
    expect(prixPoses([autre])).toBe(true);
  });
});

/**
 * Indulgence propre à la carafe (recette device 2026-08-19) : c'est la SEULE
 * trace que le joueur pose lui-même — la manette est déposée par la démo du
 * grand-père, pile sur sa trace. Exiger d'un pouce la même précision qu'un
 * placement programmé n'apprend rien, ça use.
 */
describe("tolérance par trace", () => {
  it("la carafe accepte un décalage et une rotation que la manette refuserait", () => {
    const decale = { posX: 0.10, rot: 16 };
    expect(
      estSurTrace(
        { posX: t1.posX + decale.posX, posY: t1.posY, rotation: t1.rotation + decale.rot },
        t1,
      ),
    ).toBe(true);
    expect(
      estSurTrace(
        { posX: t0.posX + decale.posX, posY: t0.posY, rotation: t0.rotation + decale.rot },
        t0,
      ),
    ).toBe(false);
  });

  it("l'indulgence reste bornée : franchement à côté, c'est non", () => {
    expect(estSurTrace({ posX: t1.posX + 0.2, posY: t1.posY, rotation: t1.rotation }, t1)).toBe(false);
    expect(estSurTrace({ posX: t1.posX, posY: t1.posY, rotation: t1.rotation + 30 }, t1)).toBe(false);
  });

  it("un dépôt au centre du coffre ne s'aimante jamais sur la carafe", () => {
    // handleAjouter dépose au centre (0.5/0.5) quand on tape depuis le
    // carrousel : la carafe doit rester à distance, sinon elle se poserait
    // toute seule et la leçon du glisser-tourner passerait à la trappe.
    expect(estSurTrace({ posX: 0.5, posY: 0.5, rotation: t1.rotation }, t1)).toBe(false);
  });
});
