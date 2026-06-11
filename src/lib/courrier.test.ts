import { describe, expect, it } from "vitest";
import type { Courrier } from "@/types/game";
import {
  ID_LETTRE_MAMAN_DEBUT,
  creerLettreMamanDebut,
  injecterLettreMamanSiAbsente,
  migrerCourriers,
} from "./courrier";

describe("creerLettreMamanDebut", () => {
  it("crée une lettre avec l'ID stable", () => {
    const l = creerLettreMamanDebut(1);
    expect(l.id).toBe(ID_LETTRE_MAMAN_DEBUT);
    expect(l.type).toBe("lettre");
  });

  it("non lue par défaut", () => {
    expect(creerLettreMamanDebut(1).lu).toBe(false);
  });

  it("jourRecu = jour passé en paramètre", () => {
    expect(creerLettreMamanDebut(42).jourRecu).toBe(42);
  });

  it("payload contient une récompense de 150 €", () => {
    const l = creerLettreMamanDebut(1);
    if (l.payload.type === "lettre") {
      expect(l.payload.recompense?.argent).toBe(150);
      expect(l.payload.expediteurId).toBe("maman");
      expect(l.payload.titre).toBeTruthy();
      expect(Array.isArray(l.payload.corps)).toBe(true);
    } else {
      expect.fail("payload should be a 'lettre'");
    }
  });
});

describe("migrerCourriers", () => {
  it("retourne [] si entrée undefined", () => {
    expect(migrerCourriers(undefined)).toEqual([]);
  });

  it("retourne [] si entrée non-array", () => {
    expect(migrerCourriers({} as unknown as Courrier[])).toEqual([]);
  });

  it("filtre les anciens courriers d'huissier", () => {
    const courriers = [
      { id: "h1", type: "huissier" } as unknown as Courrier,
      creerLettreMamanDebut(1),
      { id: "h2", type: "huissier" } as unknown as Courrier,
    ];
    const res = migrerCourriers(courriers);
    expect(res.length).toBe(1);
    expect(res[0].id).toBe(ID_LETTRE_MAMAN_DEBUT);
  });

  it("conserve les autres lettres", () => {
    const l = creerLettreMamanDebut(1);
    expect(migrerCourriers([l])).toEqual([l]);
  });
});

describe("injecterLettreMamanSiAbsente", () => {
  it("injecte la lettre si jamais distribuée", () => {
    const res = injecterLettreMamanSiAbsente([], [], 1);
    expect(res.courriers.length).toBe(1);
    expect(res.courriers[0].id).toBe(ID_LETTRE_MAMAN_DEBUT);
    expect(res.declencheursAjoutes).toEqual([ID_LETTRE_MAMAN_DEBUT]);
  });

  it("n'injecte pas si déjà dans la liste des courriers", () => {
    const existante = creerLettreMamanDebut(1);
    const res = injecterLettreMamanSiAbsente([existante], [], 1);
    expect(res.courriers.length).toBe(1);
    expect(res.declencheursAjoutes).toEqual([]);
  });

  it("n'injecte pas si déjà dans declencheursDeclenches", () => {
    const res = injecterLettreMamanSiAbsente(
      [],
      [ID_LETTRE_MAMAN_DEBUT],
      1,
    );
    expect(res.courriers).toEqual([]);
    expect(res.declencheursAjoutes).toEqual([]);
  });

  it("préserve les courriers existants quand on injecte", () => {
    const autreCourrier = {
      ...creerLettreMamanDebut(1),
      id: "autre",
    };
    const res = injecterLettreMamanSiAbsente([autreCourrier], [], 5);
    expect(res.courriers.length).toBe(2);
    expect(res.courriers[0]).toBe(autreCourrier);
    expect(res.courriers[1].id).toBe(ID_LETTRE_MAMAN_DEBUT);
    expect(res.courriers[1].jourRecu).toBe(5);
  });
});
