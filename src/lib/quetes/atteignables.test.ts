import { describe, expect, it } from "vitest";
import { objetsAtteignables } from "./atteignables";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";
import { samediBraderie } from "@/lib/evenements";
import { VINYLES_CADEAU_PAR_ANNEE, idDeclencheurCadeau } from "@/lib/anniversaire";

describe("objetsAtteignables", () => {
  it("au départ, ne renvoie que des objets tier 1 (brocante de départ débloquée)", () => {
    const state = createMockGameState();
    const objets = objetsAtteignables(state);
    expect(objets.length).toBeGreaterThan(0);
    // aucun unique / légendaire
    expect(objets.every((o) => !o.unique && o.rarete !== "legendaire")).toBe(true);
    // pas de templateId en double
    const ids = objets.map((o) => o.templateId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("n'inclut jamais l'unique des bijoux de la reine", () => {
    const state = createMockGameState();
    const ids = objetsAtteignables(state).map((o) => o.templateId);
    expect(ids).not.toContain("uniq.mo.bijou_marie_antoinette");
  });

  it("ignore la braderie même le week-end de septembre où elle est débloquée : le pool tier 4 ne doit pas apparaître", () => {
    const samedi = samediBraderie(1924);
    const baseline = objetsAtteignables(createMockGameState({ jourActuel: 1 }))
      .map((o) => o.templateId)
      .sort();
    const pendantBraderie = objetsAtteignables(
      createMockGameState({ jourActuel: samedi }),
    )
      .map((o) => o.templateId)
      .sort();
    // Sans la garde, le pool générique de la braderie (tier 4 = pool complet)
    // apparaîtrait alors même qu'aucune autre brocante tier 2-4 n'est débloquée.
    expect(pendantBraderie).toEqual(baseline);
  });

  it("exclut les vinyles cadeau d'anniversaire non encore offerts, et les réintègre une fois offerts", () => {
    // Aucun déclencheur posé : les 3 vinyles de VINYLES_CADEAU_PAR_ANNEE sont
    // encore réservés au cadeau de Maman, donc introuvables en chinage — une
    // quête ne doit jamais les cibler (sinon introuvable ~1 an de jeu).
    const sansCadeaux = objetsAtteignables(createMockGameState()).map(
      (o) => o.templateId,
    );
    for (const templateId of VINYLES_CADEAU_PAR_ANNEE) {
      expect(sansCadeaux).not.toContain(templateId);
    }

    // Les 3 déclencheurs posés (les 3 cadeaux récupérés) : les vinyles
    // redeviennent des communs comme les autres, sous réserve du tier
    // débloqué. jazz_1 et whale_song sont tier 1 (fixture par défaut,
    // brocante de départ seule débloquée) ; punkbot n'entre dans le pool
    // qu'à partir du tier 3, indépendamment de l'exclusion cadeau.
    const avecCadeaux = objetsAtteignables(
      createMockGameState({
        declencheursDeclenches: [1, 2, 3].map(idDeclencheurCadeau),
      }),
    ).map((o) => o.templateId);
    expect(avecCadeaux).toContain("mus.33tours_jazz_1");
    expect(avecCadeaux).toContain("mus.vinyle_whale_song_son_terrestre_n1");
  });
});
