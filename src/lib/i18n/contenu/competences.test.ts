import { describe, expect, test } from "vitest";
import { COMPETENCES, TREES } from "@/data/competences";
import { CATEGORIES } from "@/data/categories";
import { DEBLOCAGES_PAR_NIVEAU } from "@/data/deblocagesNiveau";
import { COMPETENCES_EN, CAT_EN } from "@/lib/i18n/contenu/en/competences";
import { COMPETENCES_ES, CAT_ES } from "@/lib/i18n/contenu/es/competences";
import { DICTIONNAIRES } from "@/lib/i18n/ui";
import { libelleCategorie } from "@/lib/i18n/libelles";
import { DEBLOCAGES_EN } from "@/lib/i18n/contenu/en/deblocages";
import { DEBLOCAGES_ES } from "@/lib/i18n/contenu/es/deblocages";
import {
  descriptionBranche,
  descriptionCompetence,
  manquants,
  nomArbre,
  nomBranche,
  nomCompetence,
  orphelins,
  titreDeblocage,
} from "@/lib/i18n/contenu";

const TREE_IDS = TREES.map((t) => t.id);
const BRANCHE_KEYS = TREES.flatMap((t) => t.branches.map((b) => `${t.id}/${b.id}`));
const BRANCHE_KEYS_AVEC_DESC = TREES.flatMap((t) =>
  t.branches.filter((b) => b.description).map((b) => `${t.id}/${b.id}`),
);
const BRANCHE_KEYS_SANS_DESC = TREES.flatMap((t) =>
  t.branches.filter((b) => !b.description).map((b) => `${t.id}/${b.id}`),
);
const PALIER_IDS = COMPETENCES.map((c) => c.id);
const DEBLOCAGE_TITRES = DEBLOCAGES_PAR_NIVEAU.map((d) => d.titre);

describe.each([
  ["EN", COMPETENCES_EN],
  ["ES", COMPETENCES_ES],
] as const)("overlay compétences %s", (_, ov) => {
  test("arbres complets", () => expect(manquants(TREE_IDS, ov.arbres)).toEqual([]));
  test("arbres zéro orphelin", () => expect(orphelins(TREE_IDS, ov.arbres)).toEqual([]));
  test("branches complètes", () => expect(manquants(BRANCHE_KEYS, ov.branches)).toEqual([]));
  test("branches zéro orphelin", () => expect(orphelins(BRANCHE_KEYS, ov.branches)).toEqual([]));
  test("paliers complets", () => expect(manquants(PALIER_IDS, ov.paliers)).toEqual([]));
  test("paliers zéro orphelin", () => expect(orphelins(PALIER_IDS, ov.paliers)).toEqual([]));

  test("branches sans description FR : pas de description en overlay", () => {
    for (const k of BRANCHE_KEYS_SANS_DESC) {
      expect(ov.branches[k].description).toBeUndefined();
    }
  });
  test("branches avec description FR : description présente en overlay", () => {
    for (const k of BRANCHE_KEYS_AVEC_DESC) {
      expect(ov.branches[k].description?.trim()).toBeTruthy();
    }
  });
});

describe.each([
  ["EN", DEBLOCAGES_EN],
  ["ES", DEBLOCAGES_ES],
] as const)("overlay déblocages %s", (_, ov) => {
  test("complétude", () => expect(manquants(DEBLOCAGE_TITRES, ov)).toEqual([]));
  test("zéro orphelin", () => expect(orphelins(DEBLOCAGE_TITRES, ov)).toEqual([]));
});

test("résolution + fallback compétences", () => {
  const c = COMPETENCES.find((x) => x.id === "general.negociation.1")!;
  expect(nomCompetence(c, "fr")).toBe("Verbe haut");
  expect(nomCompetence(c, "en")).toBe("Silver tongue");
  expect(descriptionCompetence(c, "es")).toBe(
    COMPETENCES_ES.paliers["general.negociation.1"].description,
  );
  expect(nomCompetence({ id: "inconnu", nom: "Repli FR" }, "en")).toBe("Repli FR");

  const t = TREES[0];
  expect(nomArbre(t, "fr")).toBe(t.nom);
  expect(nomArbre(t, "es")).toBe(COMPETENCES_ES.arbres[t.id].nom);
});

test("nomBranche + descriptionBranche (branche sans desc FR → undefined)", () => {
  const catTree = TREES.find((t) => t.id === "cat.Musique")!;
  const reparer = catTree.branches.find((b) => b.id === "reparer")!;
  expect(descriptionBranche("cat.Musique", reparer, "en")).toBeUndefined();
  expect(descriptionBranche("cat.Musique", reparer, "es")).toBeUndefined();
  expect(nomBranche("cat.Musique", reparer, "en")).toBe(
    COMPETENCES_EN.branches["cat.Musique/reparer"].nom,
  );

  const gen = TREES[0];
  const nego = gen.branches.find((b) => b.id === "negociation")!;
  expect(descriptionBranche("general", nego, "en")).toBe("Your counteroffers hold longer.");
  expect(descriptionBranche("general", nego, "fr")).toBe(nego.description);
});

test("ids general.presentation.1/2/3 (câblés en dur par PersonaInfoOverlay) existent", () => {
  for (const id of [
    "general.presentation.1",
    "general.presentation.2",
    "general.presentation.3",
  ]) {
    expect(PALIER_IDS).toContain(id);
  }
});

describe.each([
  ["EN", CAT_EN, DICTIONNAIRES.en],
  ["ES", CAT_ES, DICTIONNAIRES.es],
] as const)("table catégories %s = dico UI", (_, cat, dico) => {
  test("libellés identiques au dictionnaire UI", () => {
    for (const c of CATEGORIES) {
      expect(cat[c]).toBe(libelleCategorie(c, dico));
    }
  });
});

test("résolution + fallback déblocages", () => {
  const dep = DEBLOCAGES_PAR_NIVEAU.find(
    (d) => d.titre === "Quêtes quotidiennes et hebdomadaires",
  )!;
  expect(titreDeblocage(dep, "fr")).toBe(dep.titre);
  expect(titreDeblocage(dep, "en")).toBe("Daily and weekly quests");
  expect(titreDeblocage(dep, "es")).toBe(DEBLOCAGES_ES[dep.titre]);
  expect(titreDeblocage({ titre: "Inconnu" }, "es")).toBe("Inconnu");
});
