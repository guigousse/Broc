import { describe, expect, test } from "vitest";
import { DICTIONNAIRES } from "@/lib/i18n/ui";
import { libelleLedger } from "@/lib/i18n/libelles";

const base = { id: "l1", jour: 3, timestamp: 0, recette: 0, depense: 5, soldeApres: 100 };

describe("libelleLedger — params structurés → rendu localisé", () => {
  test("frais_brocante avec params : brocante localisée", () => {
    const e = {
      ...base,
      kind: "frais_brocante",
      designation: "Entrée · Vide-grenier du quartier",
      params: { brocanteId: "vide-grenier-quartier" },
    } as never;
    expect(libelleLedger(e, DICTIONNAIRES.en, "en", [])).toContain("Neighborhood yard sale");
    expect(libelleLedger(e, DICTIONNAIRES.fr, "fr", [])).toBe("Entrée · Vide-grenier du quartier");
  });

  test("vieille entrée sans params : fallback designation FR dans toutes les locales", () => {
    const e = { ...base, kind: "loyer", designation: "Loyer · Garage" } as never;
    expect(libelleLedger(e, DICTIONNAIRES.es, "es", [])).toBe("Loyer · Garage");
    expect(libelleLedger(e, DICTIONNAIRES.en, "en", [])).toBe("Loyer · Garage");
  });

  test("loyer avec params : palier localisé", () => {
    const e = { ...base, kind: "loyer", designation: "Loyer · Garage", params: { niveau: 1 } } as never;
    expect(libelleLedger(e, DICTIONNAIRES.fr, "fr", [])).toBe("Loyer · Garage");
    // EN : le palier N1 est traduit par l'overlay divers.
    expect(libelleLedger(e, DICTIONNAIRES.en, "en", [])).toContain("Rent");
  });

  test("session_chinage singulier/pluriel par langue", () => {
    const chinage = (nb: number) =>
      ({
        ...base,
        kind: "session_chinage",
        designation: "x",
        params: { brocanteId: "vide-grenier-quartier", nb },
      }) as never;
    const un = chinage(1);
    const n = chinage(3);
    expect(libelleLedger(un, DICTIONNAIRES.en, "en", [])).toMatch(/1 .*acquired|1 find/i);
    expect(libelleLedger(n, DICTIONNAIRES.en, "en", [])).toContain("3");
    // FR : reproduit exactement l'ancien libellé « 1 acqui » / « 3 acquis ».
    expect(libelleLedger(un, DICTIONNAIRES.fr, "fr", [])).toBe("Vide-grenier du quartier · 1 acqui");
    expect(libelleLedger(n, DICTIONNAIRES.fr, "fr", [])).toBe("Vide-grenier du quartier · 3 acquis");
  });

  test("session_vente singulier/pluriel FR", () => {
    const vente = (nb: number) =>
      ({ ...base, kind: "session_vente", designation: "x", params: { nb } }) as never;
    const une = vente(1);
    const n = vente(2);
    expect(libelleLedger(une, DICTIONNAIRES.fr, "fr", [])).toBe("Étal · 1 vente");
    expect(libelleLedger(n, DICTIONNAIRES.fr, "fr", [])).toBe("Étal · 2 ventes");
  });

  test("gazette avec params : jour interpolé", () => {
    const e = { ...base, kind: "gazette", designation: "Gazette du jour 4", params: { jour: 4 } } as never;
    expect(libelleLedger(e, DICTIONNAIRES.fr, "fr", [])).toBe("Gazette du jour 4");
    expect(libelleLedger(e, DICTIONNAIRES.en, "en", [])).toContain("4");
  });

  test("courrier_recompense : titre résolu par courrierId", () => {
    const courrier = {
      id: "c1",
      payload: { type: "lettre", titre: "Un cadeau", corps: [] },
    } as never;
    const e = {
      ...base,
      recette: 50,
      depense: 0,
      kind: "courrier_recompense",
      designation: "Un cadeau",
      params: { courrierId: "c1" },
    } as never;
    expect(libelleLedger(e, DICTIONNAIRES.fr, "fr", [courrier])).toBe("Un cadeau");
    // Courrier introuvable → fallback designation.
    expect(libelleLedger(e, DICTIONNAIRES.fr, "fr", [])).toBe("Un cadeau");
  });

  test("mission_recompense : préfixe localisé + titre du courrier", () => {
    const courrier = {
      id: "m1",
      payload: { type: "mission", titre: "Le vase", corps: [] },
    } as never;
    const e = {
      ...base,
      recette: 80,
      depense: 0,
      kind: "mission_recompense",
      designation: "Mission · Le vase",
      params: { courrierId: "m1" },
    } as never;
    expect(libelleLedger(e, DICTIONNAIRES.fr, "fr", [courrier])).toBe("Mission · Le vase");
    expect(libelleLedger(e, DICTIONNAIRES.en, "en", [courrier])).toContain("Le vase");
  });

  test("mission_recompense : courrier purgé + params.gabaritId → titre EN régénéré", () => {
    // Lot périodique purgé : le courrier n'est plus dans `courriers`, mais les
    // params portent de quoi régénérer le titre depuis le gabarit (SP4).
    const e = {
      ...base,
      recette: 10,
      depense: 0,
      kind: "mission_recompense",
      designation: "Mission · Recherché : PlayBox Pocket",
      params: {
        courrierId: "quo_purge_1",
        gabaritId: "generique#0",
        etatMin: "Bon",
        templateIds: ["jx.playbox_pocket"],
      },
    } as never;
    // EN : titre régénéré via l'overlay gabarit ("Wanted: …") avec la cible localisée.
    const en = libelleLedger(e, DICTIONNAIRES.en, "en", []);
    expect(en).toContain("Wanted:");
    expect(en).toContain("PlayBox Pocket");
    // FR : pas de régénération → designation FR canonique historisée.
    expect(libelleLedger(e, DICTIONNAIRES.fr, "fr", [])).toBe("Mission · Recherché : PlayBox Pocket");
  });

  test("mission_recompense : courrier purgé sans gabaritId → fallback designation", () => {
    const e = {
      ...base,
      recette: 10,
      depense: 0,
      kind: "mission_recompense",
      designation: "Mission · Le vase",
      params: { courrierId: "purge_sans_gabarit" },
    } as never;
    expect(libelleLedger(e, DICTIONNAIRES.en, "en", [])).toBe("Mission · Le vase");
    expect(libelleLedger(e, DICTIONNAIRES.fr, "fr", [])).toBe("Mission · Le vase");
  });
});
