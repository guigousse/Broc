import { statSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Le fond du Bazar est un livrable d'illustration : sa qualité se juge à l'œil,
 * pas au test. Ce filet ne prouve qu'une chose, mais elle est utile — le fichier
 * est là et pèse ce qu'un panorama doit peser. Sans lui, une scène au fond
 * manquant se rendrait sans erreur, avec un simple rectangle vide en guise de
 * boutique.
 */
describe("le fond du Bazar", () => {
  it("est présent et d'un poids raisonnable", () => {
    const s = statSync("public/bazar/fond-bazar.webp");
    expect(s.isFile()).toBe(true);
    // En dessous de 100 Ko c'est un placeholder ou une image ratée ; au-dessus
    // de 1,5 Mo, le WebView iOS le paie au chargement (cf. fond-cabinet.webp,
    // ~620 Ko pour les mêmes 2752×1536).
    expect(s.size).toBeGreaterThan(100_000);
    expect(s.size).toBeLessThan(1_500_000);
  });
});
