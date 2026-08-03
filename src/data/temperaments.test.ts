import { describe, expect, test } from "vitest";
import {
  TEMPERAMENT_CLIENTS,
  TEMPERAMENT_VENDEURS,
  temperamentDe,
} from "@/data/temperaments";
import { ALL_PERSONNAGES, ARCHETYPES } from "@/data/clients";
import { CELEBRITES } from "@/data/celebrites";
import { NOM_ARCHETYPE } from "@/lib/personas";
import {
  getClientIllustration,
  getClientIllustrationFache,
} from "@/lib/personaIllustrations";

describe("mapping archétype → tempérament", () => {
  // Vendeurs : le Record typé sur VendeurArchetypeId force déjà la
  // complétude à la compilation — on verrouille ici la symétrie inverse
  // (pas de clé fantôme si un archétype disparaît du registre).
  test("vendeurs : mêmes clés que le registre des archétypes", () => {
    expect(Object.keys(TEMPERAMENT_VENDEURS).sort()).toEqual(
      Object.keys(NOM_ARCHETYPE).sort(),
    );
  });

  test("clients : chaque archétype de clients.ts est mappé, sans orphelin", () => {
    const ids = ARCHETYPES.map((a) => a.id).sort();
    expect(Object.keys(TEMPERAMENT_CLIENTS).sort()).toEqual(ids);
  });

  test("temperamentDe : vendeur, client, inconnu", () => {
    expect(temperamentDe("grincheux")).toBe("bourru");
    expect(temperamentDe("etudiant_fauche")).toBe("radin");
    expect(temperamentDe("celebrite_inconnue")).toBeUndefined();
  });
});

describe("illustrations des acheteurs", () => {
  test("chaque personnage de clients.ts a ses illustrations calme + fâchée mappées", () => {
    for (const p of ALL_PERSONNAGES) {
      const calme = getClientIllustration(p.id);
      const fache = getClientIllustrationFache(p.id);
      expect(calme, p.id).toBeDefined();
      expect(fache, p.id).toBeDefined();
      expect(fache, p.id).not.toBe(calme);
    }
  });

  test("personnage sans casting croisé → portrait dédié client-<archetype>-<i>", () => {
    expect(getClientIllustration("bibliophile.1")).toBe(
      "/personas/clients/client-bibliophile-1.webp",
    );
    expect(getClientIllustrationFache("bibliophile.1")).toBe(
      "/personas/clients/client-bibliophile-1-fache.webp",
    );
  });

  test("casting croisé : les personnages partagés pointent sur leur portrait d'origine", () => {
    // Mamie Odette vend au chinage ET chine en vente : même visage partout.
    expect(getClientIllustration("retraite_chineur.1")).toBe(
      "/personas/vendeur-mamie.webp",
    );
    expect(getClientIllustrationFache("retraite_chineur.1")).toBe(
      "/personas/vendeur-mamie-fache.webp",
    );
    // Clara, commanditaire set designer, achète comme décoratrice.
    expect(getClientIllustration("decorateur.0")).toBe(
      "/personas/commanditaires/set-designer.webp",
    );
    expect(getClientIllustrationFache("decorateur.0")).toBe(
      "/personas/commanditaires/set-designer-fache.webp",
    );
  });

  test("chaque célébrité du carnet mondain a ses illustrations calme + fâchée", () => {
    for (const nom of CELEBRITES) {
      const id = `celebrite.marche-saint-ouen.3.${nom}`;
      const calme = getClientIllustration(id);
      expect(calme, nom).toMatch(/^\/personas\/clients\/client-celebrite-/);
      expect(getClientIllustrationFache(id), nom).toBe(
        calme!.replace(".webp", "-fache.webp"),
      );
    }
  });

  test("célébrité hors pool / personnage inconnu → pas d'illustration (silhouette)", () => {
    expect(getClientIllustration("celebrite")).toBeUndefined();
    expect(getClientIllustrationFache("celebrite")).toBeUndefined();
    expect(
      getClientIllustration("celebrite.paris_marche.3.Brigitte Marceau"),
    ).toBeUndefined();
    expect(getClientIllustration("retraite_chineur")).toBeUndefined();
  });
});
