import { describe, expect, test } from "vitest";
import {
  TEMPERAMENT_CLIENTS,
  TEMPERAMENT_VENDEURS,
  temperamentDe,
} from "@/data/temperaments";
import { ARCHETYPES } from "@/data/clients";
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
  test("chaque archétype de clients.ts a ses illustrations calme + fâchée mappées", () => {
    for (const a of ARCHETYPES) {
      expect(getClientIllustration(a.id), a.id).toBe(
        `/personas/clients/client-${a.id}.webp`,
      );
      expect(getClientIllustrationFache(a.id), a.id).toBe(
        `/personas/clients/client-${a.id}-fache.webp`,
      );
    }
  });

  test("célébrité / archétype inconnu → pas d'illustration (silhouette)", () => {
    expect(getClientIllustration("celebrite")).toBeUndefined();
    expect(getClientIllustrationFache("celebrite")).toBeUndefined();
  });
});
