import { describe, expect, it } from "vitest";
import { estSurTrace, traceActive, tracesToutesPosees } from "./coffreTuto";
import { TRACES_TUTORIEL } from "@/data/tutorielScenario";

const t0 = TRACES_TUTORIEL[0]; // manette, rotation 0
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
    expect(estSurTrace({ posX: t0.posX + 0.05, posY: t0.posY, rotation: 8 }, t0)).toBe(true);
    expect(estSurTrace({ posX: t1.posX, posY: t1.posY - 0.04, rotation: 47 }, t1)).toBe(true);
  });
  it("refuse hors distance ou hors angle", () => {
    expect(estSurTrace({ posX: t0.posX + 0.12, posY: t0.posY, rotation: 0 }, t0)).toBe(false);
    expect(estSurTrace({ posX: t1.posX, posY: t1.posY, rotation: 90 }, t1)).toBe(false);
  });
  it("gère le tour complet (350° ≈ −10°) et les champs absents", () => {
    expect(estSurTrace({ posX: t0.posX, posY: t0.posY, rotation: 352 }, t0)).toBe(true);
    expect(estSurTrace({ rotation: undefined, posX: undefined, posY: undefined }, t0)).toBe(false);
  });
});

describe("tracesToutesPosees", () => {
  const ovManette = { objet: { templateId: "jx.manette_vibraduo" }, posX: t0.posX, posY: t0.posY, rotation: 0 };
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
