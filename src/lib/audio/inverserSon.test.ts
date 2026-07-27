import { describe, expect, it } from "vitest";
import {
  SEUIL_SILENCE,
  inverserEtRogner,
  premierEchantillonAudible,
} from "./inverserSon";

/** Fabrique un canal à partir d'une liste d'amplitudes. */
const canal = (...v: number[]) => Float32Array.from(v);

/**
 * Amplitudes attendues, passées par un Float32Array : 0,9 n'est pas
 * représentable exactement en simple précision, comparer aux littéraux
 * échouerait pour une raison qui n'a rien à voir avec le code testé.
 */
const attendu = (...v: number[]) => [...canal(...v)];

describe("premierEchantillonAudible", () => {
  it("trouve le premier échantillon au-dessus du seuil", () => {
    expect(premierEchantillonAudible([canal(0, 0, 0, 0.5, 0.2)])).toBe(3);
  });

  it("renvoie 0 quand le son démarre net", () => {
    expect(premierEchantillonAudible([canal(0.9, 0.4, 0)])).toBe(0);
  });

  it("garde tout quand rien ne dépasse le seuil", () => {
    // Un tampon entièrement muet ne doit pas être réduit à néant : mieux vaut
    // un son inaudible qu'un tampon vide.
    expect(premierEchantillonAudible([canal(0, 0.001, 0, 0.002)])).toBe(0);
  });

  it("ignore le bruit de fond juste sous le seuil", () => {
    const sousSeuil = SEUIL_SILENCE * 0.5;
    expect(
      premierEchantillonAudible([canal(sousSeuil, sousSeuil, 0.8)]),
    ).toBe(2);
  });

  it("retient le canal qui parle le premier", () => {
    const gauche = canal(0, 0, 0, 0, 0.7);
    const droite = canal(0, 0.6, 0, 0, 0);
    expect(premierEchantillonAudible([gauche, droite])).toBe(1);
    // L'ordre des canaux ne change pas le résultat.
    expect(premierEchantillonAudible([droite, gauche])).toBe(1);
  });

  it("tolère un tampon vide", () => {
    expect(premierEchantillonAudible([])).toBe(0);
    expect(premierEchantillonAudible([canal()])).toBe(0);
  });

  it("compte les amplitudes négatives comme audibles", () => {
    expect(premierEchantillonAudible([canal(0, -0.9, 0)])).toBe(1);
  });
});

describe("inverserEtRogner", () => {
  it("retourne le son", () => {
    const { canaux } = inverserEtRogner([canal(0.1, 0.5, 0.9)]);
    expect([...canaux[0]]).toEqual(attendu(0.9, 0.5, 0.1));
  });

  it("rogne la queue de silence devenue amorce", () => {
    // Cas réel : une fermeture de coffre = un impact suivi d'une traîne
    // muette. Retournée, la traîne passe devant.
    const source = canal(0.9, 0.5, 0.2, 0, 0, 0);
    const { canaux, rognes } = inverserEtRogner([source]);
    expect(rognes).toBe(3);
    expect([...canaux[0]]).toEqual(attendu(0.2, 0.5, 0.9));
  });

  it("ne rogne rien quand la fin du son est déjà audible", () => {
    const { canaux, rognes } = inverserEtRogner([canal(0.1, 0.5, 0.9)]);
    expect(rognes).toBe(0);
    expect(canaux[0].length).toBe(3);
  });

  it("rogne les canaux du même nombre d'échantillons", () => {
    // Rogner chaque canal à son propre point les désynchroniserait.
    const gauche = canal(0.9, 0, 0, 0);
    const droite = canal(0.9, 0, 0.4, 0);
    const { canaux, rognes } = inverserEtRogner([gauche, droite]);
    expect(rognes).toBe(1);
    expect(canaux[0].length).toBe(canaux[1].length);
    expect(canaux[0].length).toBe(3);
  });

  it("ne modifie pas les tableaux fournis", () => {
    const source = canal(0.9, 0.5, 0, 0);
    const avant = [...source];
    inverserEtRogner([source]);
    expect([...source]).toEqual(avant);
  });

  it("ne renvoie jamais un tampon vide, même sur un son muet", () => {
    const { canaux, rognes } = inverserEtRogner([canal(0, 0, 0)]);
    expect(rognes).toBe(0);
    expect(canaux[0].length).toBe(3);
  });
});
