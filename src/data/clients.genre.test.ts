/**
 * Genre grammatical des acheteurs — sert l'accord de la pastille adverse de
 * la barre de négociation (« Lui » / « Elle » / « Eux »). Le genre doit
 * coller au portrait : un personnage partagé avec le chinage ou le courrier
 * (casting croisé) garde évidemment le même genre des deux côtés.
 */
import { describe, expect, it } from "vitest";
import { ALL_PERSONNAGES } from "./clients";
import { GENRE_VENDEUR } from "@/lib/personas";

describe("genre des acheteurs", () => {
  it("chacun des 48 personnages porte un genre", () => {
    expect(ALL_PERSONNAGES.length).toBe(48);
    for (const p of ALL_PERSONNAGES) {
      expect(["m", "f", "n"], `genre invalide pour « ${p.nom} »`).toContain(
        p.genre,
      );
    }
  });

  function genreDe(nom: string) {
    const p = ALL_PERSONNAGES.find((x) => x.nom === nom);
    expect(p, `personnage « ${nom} » introuvable`).toBeTruthy();
    return p!.genre;
  }

  it("accorde les acheteuses au féminin", () => {
    expect(genreDe("Mamie Odette")).toBe("f");
    expect(genreDe("Madame Vasseur")).toBe("f");
    expect(genreDe("Camille Mercier")).toBe("f"); // portrait féminin
    expect(genreDe("Sophie 33-tours")).toBe("f");
    expect(genreDe("Marina la geek")).toBe("f");
    expect(genreDe("Madame la Comtesse")).toBe("f");
    expect(genreDe("Rachida l'œil")).toBe("f");
  });

  it("laisse les acheteurs au masculin", () => {
    expect(genreDe("Monsieur Durand")).toBe("m");
    expect(genreDe("Maître Lefèvre")).toBe("m"); // portrait masculin
    expect(genreDe("Docteur Roux")).toBe("m"); // portrait masculin
    expect(genreDe("Paul-Henry")).toBe("m");
  });

  it("les groupes et les duos sont au pluriel", () => {
    expect(genreDe("Famille Martinez")).toBe("n");
    expect(genreDe("Madame Petit et son fils")).toBe("n");
    expect(genreDe("Les Garnier")).toBe("n");
    expect(genreDe("Hiroshi & Yuka")).toBe("n"); // portrait : un couple
  });

  it("le casting croisé garde le même genre qu'au chinage", () => {
    expect(genreDe("Mamie Odette")).toBe(GENRE_VENDEUR.mamie);
    expect(genreDe("Madame Vasseur")).toBe(GENRE_VENDEUR.antiquaire);
    expect(genreDe("Anatole la Combine")).toBe(GENRE_VENDEUR.malin);
    expect(genreDe("Barnabé 33-Tours")).toBe(GENRE_VENDEUR.disquaire);
    expect(genreDe("Dédé la Bretelle")).toBe(GENRE_VENDEUR.bonhomme);
    expect(genreDe("P'tit Lucien")).toBe(GENRE_VENDEUR.naif);
    expect(genreDe("Le Joueur du Vide-grenier")).toBe(GENRE_VENDEUR.joueur);
    expect(genreDe("Clara")).toBe(GENRE_VENDEUR.setdesigner);
    expect(genreDe("Arianne")).toBe(GENRE_VENDEUR.modeuse);
    expect(genreDe("Paul-Henry")).toBe(GENRE_VENDEUR.esthete);
  });
});
