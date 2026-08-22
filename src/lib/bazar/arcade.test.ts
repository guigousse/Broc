import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { JEUX_ARCADE, jeuxArcade } from "./arcade";
import { getTemplate } from "@/data/objetTemplates";
import { initCollection } from "@/lib/collection";

describe("JEUX_ARCADE", () => {
  it("porte les onze jeux, sans doublon", () => {
    expect(JEUX_ARCADE).toHaveLength(11);
    expect(new Set(JEUX_ARCADE).size).toBe(11);
  });

  // LE test qui compte. La constante est une liste écrite à la main : rien
  // n'empêche un renommage du catalogue de la laisser pointer dans le vide,
  // et le joueur verrait alors un « ??? » qui ne peut jamais tomber.
  it("chaque identifiant existe encore dans le catalogue", () => {
    for (const id of JEUX_ARCADE) {
      expect({ id, connu: getTemplate(id) !== undefined }).toEqual({ id, connu: true });
    }
  });

  it("ne contient que des objets de la catégorie Jeux & Loisirs", () => {
    for (const id of JEUX_ARCADE) {
      expect({ id, cat: getTemplate(id)!.categorie }).toEqual({ id, cat: "Jeux & Loisirs" });
    }
  });
});

describe("jeuxArcade", () => {
  it("rend les onze jeux dans l'ordre de la constante, tous inconnus sur une collection neuve", () => {
    const jeux = jeuxArcade(initCollection());
    expect(jeux.map((j) => j.templateId)).toEqual([...JEUX_ARCADE]);
    expect(jeux.every((j) => !j.trouve)).toBe(true);
  });

  it("marque trouvé le seul jeu dont le slot porte une donation", () => {
    const c = initCollection();
    const cible = JEUX_ARCADE[3];
    const cat = getTemplate(cible)!.categorie;
    c[cat].find((s) => s.templateId === cible)!.donation = { etat: "Bon", valeur: 10 };
    const jeux = jeuxArcade(c);
    expect(jeux.filter((j) => j.trouve).map((j) => j.templateId)).toEqual([cible]);
  });
});

describe("les captures", () => {
  // L'oubli d'un fichier ne se voit qu'au onzième swipe, et seulement si on
  // regarde. Un test le dit tout de suite.
  it("chaque jeu a sa capture dans public/bazar/arcade", () => {
    for (const id of JEUX_ARCADE) {
      const p = path.join(process.cwd(), "public", "bazar", "arcade", `${id}.webp`);
      expect({ id, present: existsSync(p) }).toEqual({ id, present: true });
    }
  });
});
