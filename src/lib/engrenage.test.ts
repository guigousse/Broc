/**
 * Le contour d'engrenage de la pièce de réparation. De la géométrie pure :
 * elle se vérifie au chiffre, là où le rendu ne se juge qu'à l'œil.
 */
import { describe, expect, it } from "vitest";
import { cheminEngrenage, RAYON_CREUX, RAYON_DENT } from "./engrenage";

/** Les couples (x, y) d'un chemin SVG, quel que soit le type de segment. */
function points(d: string): Array<[number, number]> {
  const nombres = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const out: Array<[number, number]> = [];
  // Les arcs portent 7 paramètres dont les deux derniers sont le point ; les
  // segments droits n'en portent que deux. On relit donc le chemin segment par
  // segment plutôt que de découper la liste en paires.
  for (const seg of d.match(/[MLA][^MLAZ]*/g) ?? []) {
    const n = seg.slice(1).match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    out.push([n[n.length - 2], n[n.length - 1]]);
  }
  expect(nombres.length).toBeGreaterThan(0);
  return out;
}

const distance = ([x, y]: [number, number]) => Math.hypot(x - 50, y - 50);

describe("cheminEngrenage", () => {
  it("rend un chemin fermé", () => {
    expect(cheminEngrenage(10).trim().endsWith("Z")).toBe(true);
  });

  /**
   * Quatre sommets par dent — deux au creux, deux à la pointe — plus le point
   * de départ, sur lequel le dernier arc de creux revient boucler. C'est cette
   * coïncidence qui ferme la denture : sans elle, `Z` tirerait une corde
   * droite en travers du dernier creux.
   */
  it("pose quatre sommets par dent, et referme sur son point de départ", () => {
    for (const dents of [8, 10, 12]) {
      const p = points(cheminEngrenage(dents));
      expect(p).toHaveLength(dents * 4 + 1);
      expect(p[p.length - 1]).toEqual(p[0]);
    }
  });

  /**
   * Le contour ne connaît que DEUX rayons — la pointe et le creux. C'est ce
   * qui fait lire une denture plutôt qu'une étoile : un sommet intermédiaire
   * arrondirait la dent et le biseau du rebord n'aurait plus d'arête à suivre.
   */
  it("chaque sommet est soit à la pointe, soit au creux", () => {
    for (const p of points(cheminEngrenage(10))) {
      const r = distance(p);
      const surUneDent = Math.abs(r - RAYON_DENT) < 0.05;
      const dansUnCreux = Math.abs(r - RAYON_CREUX) < 0.05;
      expect(surUneDent || dansUnCreux).toBe(true);
    }
  });

  it("tient dans la boîte de 100, sans déborder ni flotter au centre", () => {
    for (const [x, y] of points(cheminEngrenage(10))) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(100);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(100);
    }
    expect(RAYON_DENT).toBeLessThanOrEqual(50);
    expect(RAYON_CREUX).toBeLessThan(RAYON_DENT);
  });

  // Le chemin part dans un attribut de rendu : deux appels identiques doivent
  // rendre la MÊME chaîne, sinon React reconstruit le tracé à chaque rendu.
  it("est déterministe", () => {
    expect(cheminEngrenage(10)).toBe(cheminEngrenage(10));
  });

  it("refuse une denture qui ne ferait pas un engrenage", () => {
    expect(() => cheminEngrenage(2)).toThrow();
  });
});
