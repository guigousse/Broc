import { describe, expect, it } from "vitest";
import {
  RELEVE_ARRIVEE_MS,
  RELEVE_ATTENTE_MS,
  RELEVE_BASCULE_MS,
  RELEVE_CIBLE,
  RELEVE_DUREE_MS,
  RELEVE_ENTREDEUX_MS,
  RELEVE_FERMETURE_MS,
  RELEVE_TRAJET_MS,
  etatReleve,
  type Geometrie,
} from "./releveVehicule";

// Deux géométries volontairement distinctes : chaque modèle a sa place et son
// échelle propres sur le fond de garage, et les confondre est le défaut que
// cette suite doit attraper.
const ANCIEN: Geometrie = { x: 0.5, y: 0.68, scale: 0.82 };
const NOUVEAU: Geometrie = { x: 0.5, y: 0.705, scale: 0.975 };

const etat = (t: number) => etatReleve(t, ANCIEN, NOUVEAU);

describe("etatReleve — aller", () => {
  it("part du véhicule possédé, à sa place, coffre en train de se clore", () => {
    const e = etat(0);
    expect(e.geometrie).toEqual(ANCIEN);
    expect(e.opacite).toBe(1);
    expect(e.coffreFerme).toBe(true);
    expect(e.nouveauVehicule).toBe(false);
  });

  it("ne bouge pas tant que le coffre se ferme", () => {
    expect(etat(RELEVE_FERMETURE_MS - 1).geometrie).toEqual(ANCIEN);
    expect(etat(RELEVE_FERMETURE_MS + RELEVE_ATTENTE_MS - 1).geometrie).toEqual(
      ANCIEN,
    );
  });

  it("s'éloigne vers le point de fuite en rapetissant", () => {
    const debut = RELEVE_FERMETURE_MS + RELEVE_ATTENTE_MS;
    const mi = etat(debut + RELEVE_TRAJET_MS / 2);
    expect(mi.geometrie!.scale).toBeLessThan(ANCIEN.scale);
    expect(mi.geometrie!.scale).toBeGreaterThan(RELEVE_CIBLE.scale);
    // Toujours l'ancien véhicule : l'échange n'a pas encore eu lieu.
    expect(mi.nouveauVehicule).toBe(false);
  });

  it("s'efface avant de disparaître, jamais d'un coup", () => {
    const debut = RELEVE_FERMETURE_MS + RELEVE_ATTENTE_MS;
    expect(etat(debut + RELEVE_TRAJET_MS * 0.5).opacite).toBe(1);
    const tardif = etat(debut + RELEVE_TRAJET_MS * 0.9).opacite;
    expect(tardif).toBeGreaterThan(0);
    expect(tardif).toBeLessThan(1);
  });
});

describe("etatReleve — la bascule", () => {
  it("le garage est vide au moment de l'échange", () => {
    const e = etat(RELEVE_BASCULE_MS);
    expect(e.geometrie).toBeNull();
    expect(e.opacite).toBe(0);
    // Garantie centrale : si l'état basculait plus tôt, on verrait le NOUVEAU
    // véhicule s'éloigner au lieu de l'ancien.
    expect(e.nouveauVehicule).toBe(true);
  });

  it("reste vide pendant tout l'entre-deux", () => {
    expect(
      etat(RELEVE_BASCULE_MS + RELEVE_ENTREDEUX_MS - 1).geometrie,
    ).toBeNull();
  });
});

describe("etatReleve — retour", () => {
  const debutRetour = RELEVE_BASCULE_MS + RELEVE_ENTREDEUX_MS;

  it("surgit du point de fuite, pas de la place du véhicule vendu", () => {
    const e = etat(debutRetour);
    expect(e.geometrie!.scale).toBeCloseTo(RELEVE_CIBLE.scale, 5);
    expect(e.nouveauVehicule).toBe(true);
  });

  it("grandit en revenant, à l'inverse de l'aller", () => {
    const tot = etat(debutRetour + RELEVE_TRAJET_MS * 0.25).geometrie!.scale;
    const tard = etat(debutRetour + RELEVE_TRAJET_MS * 0.75).geometrie!.scale;
    expect(tard).toBeGreaterThan(tot);
  });

  it("se range à la place du NOUVEAU véhicule, pas de l'ancien", () => {
    const e = etat(RELEVE_ARRIVEE_MS);
    expect(e.geometrie).toEqual(NOUVEAU);
    expect(e.geometrie).not.toEqual(ANCIEN);
  });

  it("le coffre ne s'ouvre qu'une fois le véhicule rangé", () => {
    expect(etat(RELEVE_ARRIVEE_MS - 1).coffreFerme).toBe(true);
    expect(etat(RELEVE_ARRIVEE_MS).coffreFerme).toBe(false);
  });

  it("finit en pleine opacité, à la bonne place, coffre ouvert", () => {
    const e = etat(RELEVE_DUREE_MS);
    expect(e.geometrie).toEqual(NOUVEAU);
    expect(e.opacite).toBe(1);
    expect(e.coffreFerme).toBe(false);
    expect(e.nouveauVehicule).toBe(true);
  });

  it("reste stable au-delà de la fin", () => {
    expect(etat(RELEVE_DUREE_MS + 5000)).toEqual(etat(RELEVE_DUREE_MS));
  });
});

describe("etatReleve — invariants", () => {
  it("l'opacité ne sort jamais de [0, 1]", () => {
    for (let t = -100; t <= RELEVE_DUREE_MS + 100; t += 13) {
      const o = etat(t).opacite;
      expect(o).toBeGreaterThanOrEqual(0);
      expect(o).toBeLessThanOrEqual(1);
    }
  });

  it("l'échelle reste positive tant qu'un véhicule est à l'écran", () => {
    for (let t = 0; t <= RELEVE_DUREE_MS; t += 13) {
      const g = etat(t).geometrie;
      if (g) expect(g.scale).toBeGreaterThan(0);
    }
  });

  it("le véhicule ne roule jamais coffre ouvert", () => {
    for (let t = 0; t < RELEVE_ARRIVEE_MS; t += 13) {
      expect(etat(t).coffreFerme).toBe(true);
    }
  });

  it("l'aller et le retour durent exactement le même temps", () => {
    const aller = RELEVE_BASCULE_MS - RELEVE_FERMETURE_MS - RELEVE_ATTENTE_MS;
    const retour = RELEVE_ARRIVEE_MS - RELEVE_BASCULE_MS - RELEVE_ENTREDEUX_MS;
    expect(aller).toBe(retour);
    expect(aller).toBe(RELEVE_TRAJET_MS);
  });
});
