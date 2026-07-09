import { describe, expect, test } from "vitest";
import { ALL_PERSONNAGES } from "@/data/clients";
import { NOM_ARCHETYPE, NOM_VENDEUR } from "@/lib/personas";
import { EXPEDITEURS } from "@/data/expediteursCourrier";
import { PERSONNAGES_EN } from "@/lib/i18n/contenu/en/personnages";
import { PERSONNAGES_ES } from "@/lib/i18n/contenu/es/personnages";
import {
  manquants,
  orphelins,
  nomClient,
  ambianceClient,
  nomArchetypeClient,
  nomArchetypeVendeur,
  nomVendeur,
  nomExpediteur,
  personnaliteExpediteur,
  signatureExpediteur,
} from "@/lib/i18n/contenu";

/* Ids canoniques dérivés du FR (source unique). */
const ARCH_CLIENT_IDS = [...new Set(ALL_PERSONNAGES.map((p) => p.archetypeId))];
const PERSONNAGE_IDS = ALL_PERSONNAGES.map((p) => p.id);
/** Les 4 commanditaires pointent vers un expéditeur → absents de `vendeurs`. */
const COMMANDITAIRES = ["joueur", "setdesigner", "modeuse", "esthete"];
const VENDEUR_ARCH_IDS = Object.keys(NOM_VENDEUR); // 14
const VENDEUR_NON_COMMANDITAIRE_IDS = VENDEUR_ARCH_IDS.filter(
  (id) => !COMMANDITAIRES.includes(id),
); // 10
const EXPEDITEUR_IDS = Object.keys(EXPEDITEURS); // 6

describe.each([
  ["EN", PERSONNAGES_EN],
  ["ES", PERSONNAGES_ES],
] as const)("overlay personnages %s", (_, overlay) => {
  test("archétypes clients complets", () =>
    expect(manquants(ARCH_CLIENT_IDS, overlay.archetypesClient)).toEqual([]));
  test("archétypes clients sans orphelin", () =>
    expect(orphelins(ARCH_CLIENT_IDS, overlay.archetypesClient)).toEqual([]));

  test("personnages complets", () =>
    expect(manquants(PERSONNAGE_IDS, overlay.personnages)).toEqual([]));
  test("personnages sans orphelin", () =>
    expect(orphelins(PERSONNAGE_IDS, overlay.personnages)).toEqual([]));

  test("14 archétypes vendeur complets", () =>
    expect(manquants(VENDEUR_ARCH_IDS, overlay.archetypesVendeur)).toEqual([]));
  test("archétypes vendeur sans orphelin", () =>
    expect(orphelins(VENDEUR_ARCH_IDS, overlay.archetypesVendeur)).toEqual([]));

  test("10 vendeurs non-commanditaires complets", () =>
    expect(manquants(VENDEUR_NON_COMMANDITAIRE_IDS, overlay.vendeurs)).toEqual(
      [],
    ));
  test("les commanditaires ne sont PAS dupliqués dans vendeurs", () =>
    expect(
      COMMANDITAIRES.filter((id) => id in overlay.vendeurs),
    ).toEqual([]));
  test("vendeurs sans orphelin (hors commanditaires)", () =>
    expect(
      orphelins(VENDEUR_NON_COMMANDITAIRE_IDS, overlay.vendeurs),
    ).toEqual([]));

  test("6 expéditeurs complets", () =>
    expect(manquants(EXPEDITEUR_IDS, overlay.expediteurs)).toEqual([]));
  test("expéditeurs sans orphelin", () =>
    expect(orphelins(EXPEDITEUR_IDS, overlay.expediteurs)).toEqual([]));

  test("vendeurInconnu défini", () =>
    expect(overlay.vendeurInconnu).toBeTruthy());
});

describe("résolution clients", () => {
  const p = ALL_PERSONNAGES[0];
  test("fallback FR", () => {
    expect(nomClient(p, "fr")).toBe(p.nom);
    expect(ambianceClient(p, "fr")).toBe(p.ambiance);
  });
  test("EN traduit", () => {
    expect(nomClient(p, "en")).toBe(PERSONNAGES_EN.personnages[p.id].nom);
    expect(ambianceClient(p, "en")).toBe(
      PERSONNAGES_EN.personnages[p.id].ambiance,
    );
  });
  test("archétype client fallback + traduction", () => {
    expect(nomArchetypeClient(p.archetypeId, p.archetypeNom, "fr")).toBe(
      p.archetypeNom,
    );
    expect(nomArchetypeClient(p.archetypeId, p.archetypeNom, "es")).toBe(
      PERSONNAGES_ES.archetypesClient[p.archetypeId].nom,
    );
    // Id inconnu → fallback FR fourni.
    expect(nomArchetypeClient("zzz", "SecoursFR", "en")).toBe("SecoursFR");
  });
});

describe("résolution vendeurs", () => {
  test("nomVendeur EN spot-check (mamie)", () => {
    expect(nomVendeur("mamie", "en")).toBe(PERSONNAGES_EN.vendeurs.mamie);
    expect(nomVendeur("mamie", "fr")).toBe(NOM_VENDEUR.mamie);
  });
  test("source unique préservée : commanditaire suit l'expéditeur", () => {
    // joueur → expéditeur jeux-video (ES) ; setdesigner → set-designer, etc.
    expect(nomVendeur("joueur", "es")).toBe(
      nomExpediteur("jeux-video", "es"),
    );
    expect(nomVendeur("joueur", "en")).toBe(
      PERSONNAGES_EN.expediteurs["jeux-video"].nom,
    );
    expect(nomVendeur("modeuse", "es")).toBe(nomExpediteur("mode", "es"));
    expect(nomVendeur("esthete", "en")).toBe(nomExpediteur("art", "en"));
  });
  test("archétype inconnu → vendeurInconnu localisé", () => {
    expect(nomVendeur("zzz", "en")).toBe(PERSONNAGES_EN.vendeurInconnu);
    expect(nomVendeur("zzz", "es")).toBe(PERSONNAGES_ES.vendeurInconnu);
    expect(nomVendeur("zzz", "fr")).toBe("Un vendeur");
  });
  test("nomArchetypeVendeur traduit + fallback", () => {
    expect(nomArchetypeVendeur("grincheux", "fr")).toBe(
      NOM_ARCHETYPE.grincheux,
    );
    expect(nomArchetypeVendeur("grincheux", "en")).toBe(
      PERSONNAGES_EN.archetypesVendeur.grincheux,
    );
  });
});

describe("résolution expéditeurs", () => {
  test("nom fallback + traduction", () => {
    expect(nomExpediteur("maman", "fr")).toBe(EXPEDITEURS.maman.nom);
    expect(nomExpediteur("maman", "en")).toBe(
      PERSONNAGES_EN.expediteurs.maman.nom,
    );
  });
  test("personnalité traduite", () => {
    expect(personnaliteExpediteur("maman", "es")).toBe(
      PERSONNAGES_ES.expediteurs.maman.personnalite,
    );
  });
  test("signature ES multi-lignes conserve le \\n", () => {
    const sig = signatureExpediteur("maman", "es");
    expect(sig).toBeTruthy();
    expect(sig).toContain("\n");
  });
  test("signature FR = source canonique", () => {
    expect(signatureExpediteur("maman", "fr")).toBe(EXPEDITEURS.maman.signature);
  });
});
