import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CelebriteEvenement } from "@/types/game";
import { BROCANTES } from "@/data/brocantes";
import { CELEBRITES } from "@/data/celebrites";
import { PERIODE_TENDANCES_JOURS } from "./tendances";
import { BOURSE_CELEBRITE, buildCelebritePersonnage, tirerCelebrite } from "./celebrite";
import { BOURSE_PAR_CLASSE } from "./vitrine";

beforeEach(() => {
  vi.spyOn(Math, "random").mockReturnValue(0.5);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("tirerCelebrite", () => {
  it("retourne un événement avec brocanteId, nom et jourSemaine", () => {
    const c = tirerCelebrite();
    expect(c.brocanteId).toBeTruthy();
    expect(c.nom).toBeTruthy();
    expect(c.jourSemaine).toBeGreaterThanOrEqual(0);
    expect(c.jourSemaine).toBeLessThan(PERIODE_TENDANCES_JOURS);
  });

  it("ne tire jamais une brocante de tier 4 (boss exclue)", () => {
    vi.restoreAllMocks();
    const boss = new Set(BROCANTES.filter((b) => b.tier === 4).map((b) => b.id));
    for (let i = 0; i < 50; i++) {
      const c = tirerCelebrite();
      expect(boss.has(c.brocanteId)).toBe(false);
    }
  });

  it("le nom appartient au catalogue CELEBRITES", () => {
    vi.restoreAllMocks();
    const set = new Set(CELEBRITES);
    for (let i = 0; i < 30; i++) {
      const c = tirerCelebrite();
      expect(set.has(c.nom)).toBe(true);
    }
  });
});

describe("buildCelebritePersonnage", () => {
  const ev: CelebriteEvenement = {
    brocanteId: "broc-1",
    nom: "La Comtesse",
    jourSemaine: 3,
  };

  it("crée un personnage avec gros appétit (>= 1.8)", () => {
    const p = buildCelebritePersonnage(ev);
    expect(p.appetitMin).toBeGreaterThanOrEqual(1.8);
    expect(p.appetitMax).toBeGreaterThanOrEqual(p.appetitMin);
  });

  it("a une faible durete (marchande peu)", () => {
    const p = buildCelebritePersonnage(ev);
    expect(p.durete).toBeLessThanOrEqual(0.2);
  });

  it("a une forte chanceMulti (achats multiples fréquents)", () => {
    const p = buildCelebritePersonnage(ev);
    expect(p.chanceMulti).toBeGreaterThanOrEqual(0.5);
  });

  it("archetypeId = 'celebrite'", () => {
    expect(buildCelebritePersonnage(ev).archetypeId).toBe("celebrite");
  });

  it("a une bourse dédiée bien au-dessus de la classe grosse (meilleur client du jeu)", () => {
    const p = buildCelebritePersonnage(ev);
    expect(p.bourseMax).toBe(BOURSE_CELEBRITE);
    expect(BOURSE_CELEBRITE).toBeGreaterThan(BOURSE_PAR_CLASSE.grosse);
  });

  it("ID stable (déterministe pour un même événement)", () => {
    expect(buildCelebritePersonnage(ev).id).toBe(
      buildCelebritePersonnage(ev).id,
    );
  });

  it("ID dépend de l'événement (différent pour deux célébrités distinctes)", () => {
    const a = buildCelebritePersonnage(ev);
    const b = buildCelebritePersonnage({ ...ev, nom: "Autre" });
    expect(a.id).not.toBe(b.id);
  });

  it("nom recopié depuis l'événement", () => {
    expect(buildCelebritePersonnage(ev).nom).toBe("La Comtesse");
  });

  it("inclut les axes de négociation calculés (margePct, elanPct, …)", () => {
    const p = buildCelebritePersonnage(ev);
    expect(typeof p.margePct).toBe("number");
    expect(typeof p.elanPct).toBe("number");
    expect(typeof p.patience).toBe("number");
    expect(typeof p.tolerancePct).toBe("number");
    expect(typeof p.sangFroid).toBe("number");
  });
});
