import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CelebriteEvenement } from "@/types/game";
import { BROCANTES } from "@/data/brocantes";
import { CELEBRITES, GENRE_CELEBRITE } from "@/data/celebrites";
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
      expect(c.brocanteId).not.toBe("grande-braderie");
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

describe("genre des célébrités", () => {
  it("chacun des 19 noms du catalogue porte un genre", () => {
    expect(CELEBRITES.length).toBe(19);
    for (const nom of CELEBRITES) {
      expect(["m", "f"], `genre manquant ou invalide pour « ${nom} »`).toContain(
        GENRE_CELEBRITE[nom],
      );
    }
  });

  it("aucune entrée orpheline dans la table de genres", () => {
    const catalogue = new Set<string>(CELEBRITES);
    for (const nom of Object.keys(GENRE_CELEBRITE)) {
      expect(catalogue.has(nom), `« ${nom} » n'est plus au catalogue`).toBe(true);
    }
  });

  it("accorde les célébrités féminines", () => {
    expect(GENRE_CELEBRITE["une héritière mondaine"]).toBe("f");
    expect(GENRE_CELEBRITE["une actrice de la Nouvelle Vague"]).toBe("f");
    expect(GENRE_CELEBRITE["une diva de l'opéra à la retraite"]).toBe("f");
    expect(GENRE_CELEBRITE["Madame de Saint-Marceaux"]).toBe("f");
    expect(GENRE_CELEBRITE["La Baronne de Villemorin"]).toBe("f");
    expect(GENRE_CELEBRITE["Lady Westmorland"]).toBe("f");
    expect(GENRE_CELEBRITE["une icône du cinéma des années 60"]).toBe("f");
  });

  it("buildCelebritePersonnage reporte le genre du catalogue", () => {
    const dame = buildCelebritePersonnage({
      brocanteId: "broc-1",
      nom: "Lady Westmorland",
      jourSemaine: 3,
    });
    expect(dame.genre).toBe("f");
    const sieur = buildCelebritePersonnage({
      brocanteId: "broc-1",
      nom: "Le Duc de Brissac",
      jourSemaine: 3,
    });
    expect(sieur.genre).toBe("m");
  });
});
