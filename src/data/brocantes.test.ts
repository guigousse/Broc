import { describe, expect, it } from "vitest";
import { BROCANTES, getBrocanteById } from "./brocantes";
import { bourseMoyenne } from "@/lib/vitrine";
import type { Brocante, ConditionDeblocage } from "@/types/game";

function atomes(c: ConditionDeblocage): ConditionDeblocage[] {
  return c.type === "ET" ? c.conditions.flatMap(atomes) : [c];
}

describe("gates des brocantes (SP2)", () => {
  it("aucune brocante n'est gatée par le niveau", () => {
    for (const b of BROCANTES) {
      expect(atomes(b.conditionDeblocage).some((a) => a.type === "niveau")).toBe(false);
    }
  });
  it("la bourse moyenne monte crescendo le long de la progression", () => {
    // Ordre de déblocage au sein de chaque tier (seuils de collection
    // croissants) : la brocante la plus dure à ouvrir doit afficher la
    // bourse moyenne la plus riche — sinon la récompense régresse.
    // La Grande Braderie (événement à prix sacrifiés) est hors progression.
    const progression: string[][] = [
      [
        "vide-grenier-quartier",
        "marche-aux-puces-dimanche",
        "bouquinerie-plein-air",
        "vide-dressing-centre",
        "brocante-club-jeux",
      ],
      [
        "deballage-collectionneurs",
        "atelier-bricoleur",
        "disquaire-independant",
        "marche-saint-ouen",
        "marche-antiquaires-bibelots",
      ],
      [
        "foire-chatou",
        "drouot-mode-couture",
        "salon-violon-ancien",
        "galerie-tableaux-sculptures",
        "salon-grands-collectionneurs",
        "galerie-arts-decoratifs",
      ],
      ["salon-antiquaires-drouot"],
    ];
    expect(progression.flat().length).toBe(BROCANTES.length - 1);

    let precedente: Brocante | undefined;
    for (const tier of progression) {
      for (const id of tier) {
        const brocante = getBrocanteById(id);
        expect(brocante, id).toBeDefined();
        if (precedente) {
          expect(
            bourseMoyenne(brocante!),
            `${id} (${bourseMoyenne(brocante!)} €) doit être plus riche que ${precedente.id} (${bourseMoyenne(precedente)} €)`,
          ).toBeGreaterThan(bourseMoyenne(precedente));
        }
        precedente = brocante;
      }
    }
  });

  it("chaque brocante de tier N>1 exige le chapitre d'invitation du tier", () => {
    const ordreParTier = { 2: 4, 3: 8, 4: 10 } as const;
    // La Grande Braderie est l'exception volontaire : événement calendaire
    // (cf. condition "braderie"), pas gatée par la progression de l'histoire.
    for (const b of BROCANTES.filter((b) => b.tier > 1 && b.id !== "grande-braderie")) {
      const chap = atomes(b.conditionDeblocage).find((a) => a.type === "chapitrePrincipal");
      expect(chap, b.id).toBeDefined();
      expect((chap as { ordre: number }).ordre).toBe(ordreParTier[b.tier as 2 | 3 | 4]);
    }
  });
});
