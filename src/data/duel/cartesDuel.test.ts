import { describe, expect, it } from "vitest";
import { CARTES } from "@/data/cartes";
import { CARTES_DUEL, statsDuel } from "@/data/duel/cartesDuel";
import { budgetDe, prixTexte } from "@/data/duel/budget";
import { actionAChoix } from "@/data/duel/types";

const MOTS_CLES = ["barrage", "prompt", "solide", "fragile", "ruse", "cri"];

describe("cartesDuel — garde du set", () => {
  it("les 50 cartes du classeur ont des stats, et rien d'autre", () => {
    expect(Object.keys(CARTES_DUEL).sort()).toEqual(CARTES.map((c) => c.id).sort());
  });

  it("respecte les domaines imprimés", () => {
    for (const c of CARTES) {
      const s = statsDuel(c.id);
      expect(s.cout, c.id).toBeGreaterThanOrEqual(1);
      expect(s.cout, c.id).toBeLessThanOrEqual(5);
      expect(s.attaque, c.id).toBeGreaterThanOrEqual(0);
      expect(s.attaque, c.id).toBeLessThanOrEqual(6);
      expect(s.pv, c.id).toBeGreaterThanOrEqual(1);
      expect(s.pv, c.id).toBeLessThanOrEqual(8);
      expect(Number.isInteger(s.attaque) && Number.isInteger(s.pv), c.id).toBe(true);
    }
  });

  it("une commune porte au plus un mot-clé ; une rare ou légendaire porte un effet", () => {
    for (const c of CARTES) {
      const t = statsDuel(c.id).texte;
      if (c.rarete === "commun") {
        if (t) expect(MOTS_CLES, c.id).toContain(t.type);
      } else {
        expect(t?.type, c.id).toBe("effet");
      }
    }
  });

  it("Prompt ⇒ attaque ≤ 3, Solide ⇒ PV ≤ 5", () => {
    for (const c of CARTES) {
      const s = statsDuel(c.id);
      if (s.texte?.type === "prompt") expect(s.attaque, c.id).toBeLessThanOrEqual(3);
      if (s.texte?.type === "solide") expect(s.pv, c.id).toBeLessThanOrEqual(5);
    }
  });

  it("un effet a 1 action (rare) ou 1 à 2 (légendaire) ; les actions à choix et l'énergie sont réservées aux bons déclencheurs", () => {
    for (const c of CARTES) {
      const t = statsDuel(c.id).texte;
      if (t?.type !== "effet") continue;
      expect(t.actions.length, c.id).toBeGreaterThanOrEqual(1);
      expect(t.actions.length, c.id).toBeLessThanOrEqual(c.rarete === "legendaire" ? 2 : 1);
      for (const a of t.actions) {
        if (actionAChoix(a)) expect(t.declencheur, c.id).toBe("pose");
        if (a.type === "energie") expect(["pose", "debutTour"], c.id).toContain(t.declencheur);
        if (a.type === "gain" && a.cible === "alliesCategorie") expect(a.categorie, c.id).toBeDefined();
      }
    }
  });

  it("le prix d'un effet reste dans sa fourchette : 1 à 3 pour une rare, 1 à 4 pour une légendaire", () => {
    for (const c of CARTES) {
      const t = statsDuel(c.id).texte;
      if (t?.type !== "effet") continue;
      expect(t.prix, c.id).toBeGreaterThanOrEqual(1);
      expect(t.prix, c.id).toBeLessThanOrEqual(c.rarete === "legendaire" ? 4 : 3);
    }
  });

  it("courbe de coût 8/12/13/10/7 ; légendaires en 4 ou 5", () => {
    const parCout = [0, 0, 0, 0, 0, 0];
    for (const c of CARTES) {
      const s = statsDuel(c.id);
      parCout[s.cout]++;
      if (c.rarete === "legendaire") expect([4, 5], c.id).toContain(s.cout);
    }
    expect(parCout.slice(1)).toEqual([8, 12, 13, 10, 7]);
  });

  it("chaque catégorie couvre les coûts 1 à 4", () => {
    const couverts = new Map<string, Set<number>>();
    for (const c of CARTES) {
      const set = couverts.get(c.serie) ?? new Set<number>();
      set.add(statsDuel(c.id).cout);
      couverts.set(c.serie, set);
    }
    for (const [serie, set] of couverts) {
      for (const cout of [1, 2, 3, 4]) expect(set.has(cout), `${serie} coût ${cout}`).toBe(true);
    }
  });

  it("chaque carte dépense exactement son budget (2C+1, +1 légendaire, moins le prix du texte)", () => {
    for (const c of CARTES) {
      const s = statsDuel(c.id);
      const attendu = budgetDe(s.cout, c.rarete) - prixTexte(s.texte);
      expect(s.attaque + s.pv, `${c.id} budget`).toBe(attendu);
    }
  });

  it("statsDuel lance sur un id inconnu", () => {
    expect(() => statsDuel("carte.inexistante")).toThrow();
  });

  it("un effet `blesse` ne porte jamais de dégâts à un objet adverse (boucle blesse → blesse)", () => {
    // blesserObjet déclenche « blesse » après un dégât ; un effet blesse qui viserait à son tour
    // objetAdverse ou tousObjetsAdverses rebouclerait sur blesserObjet. La garde de récursion
    // (effets.ts declencher) protège le moteur, mais aucune carte ne doit exploiter cette boucle.
    for (const c of CARTES) {
      const t = statsDuel(c.id).texte;
      if (t?.type !== "effet" || t.declencheur !== "blesse") continue;
      for (const a of t.actions) {
        if (a.type !== "degats") continue;
        expect(["objetAdverse", "tousObjetsAdverses"], c.id).not.toContain(a.cible);
      }
    }
  });
});
