import { describe, expect, it } from "vitest";
import { promptEtal, promptPlan1, promptPlan2 } from "./prompts.mjs";

const blocs = {
  decor: "DECOR-BLOC",
  camera: "CAMERA-BLOC",
  ambiance: "AMBIANCE-BLOC",
};

const episode = {
  id: "ep01",
  items: [
    { id: "a", nom: "Aquarelle marine du XIXe", prixTresBon: 35, fichier: "/tmp/a.webp" },
    { id: "b", nom: "Violon d'atelier", prixTresBon: 320, fichier: "/tmp/b.webp" },
  ],
  vedette: { id: "a", nom: "Aquarelle marine du XIXe", prixTresBon: 35, fichier: "/tmp/a.webp" },
  acheteur: "a French woman in her thirties, denim jacket",
  fond: "autumn morning, low raking light",
  accroche: "Elle vaut combien ?",
  plan1: { action: "she picks it up", demande: "Vous en voulez combien ?", prix: "Quarante euros." },
  plan2: { denouement: "marchande", action: "she folds her arms", replique: "Vingt-cinq." },
  chute: "Vous auriez accepté ?",
};

describe("promptEtal", () => {
  it("injecte le bloc décor et l'ambiance visuelle de l'épisode", () => {
    const p = promptEtal(episode, blocs);
    expect(p).toContain("DECOR-BLOC");
    expect(p).toContain("autumn morning, low raking light");
  });

  it("nomme les objets à poser et les rattache aux images fournies", () => {
    const p = promptEtal(episode, blocs);
    expect(p).toContain("Aquarelle marine du XIXe");
    expect(p).toContain("Violon d'atelier");
    expect(p).toMatch(/attached|reference image/i);
  });

  it("exige que l'espace du visiteur reste vide", () => {
    expect(promptEtal(episode, blocs)).toMatch(/empty|no person/i);
  });

  it("exige que les objets plats soient posés à plat, face visible", () => {
    const p = promptEtal(episode, blocs);
    expect(p).toMatch(/LIES FLAT/);
    expect(p).toMatch(/face up/);
  });

  it("désigne la première image jointe comme référence colorimétrique", () => {
    const p = promptEtal(episode, blocs);
    expect(p).toMatch(/colour reference/);
    expect(p).toMatch(/sage-green/);
  });
});

describe("promptPlan1", () => {
  it("embarque les blocs caméra et ambiance", () => {
    const p = promptPlan1(episode, blocs);
    expect(p).toContain("CAMERA-BLOC");
    expect(p).toContain("AMBIANCE-BLOC");
  });

  it("décrit l'arrivée du chineur, son geste et sa demande", () => {
    const p = promptPlan1(episode, blocs);
    expect(p).toContain("a French woman in her thirties, denim jacket");
    expect(p).toContain("she picks it up");
    expect(p).toContain("Vous en voulez combien ?");
  });

  it("place la réponse du vendeur en voix venant de derrière la caméra", () => {
    const p = promptPlan1(episode, blocs);
    expect(p).toContain("Quarante euros.");
    expect(p).toMatch(/behind the camera/i);
    expect(p).toMatch(/only person/i);
  });
});

describe("promptPlan2", () => {
  it("embarque les blocs caméra et ambiance, mais jamais le décor", () => {
    const p = promptPlan2(episode, blocs);
    expect(p).toContain("CAMERA-BLOC");
    expect(p).toContain("AMBIANCE-BLOC");
    expect(p).not.toContain("DECOR-BLOC");
  });

  it("annonce une continuité stricte avec l'image d'entrée", () => {
    expect(promptPlan2(episode, blocs)).toMatch(/continu(es|ation)/i);
  });

  it("décrit le marchandage", () => {
    const p = promptPlan2(episode, blocs);
    expect(p).toContain("she folds her arms");
    expect(p).toContain("Vingt-cinq.");
    expect(p).toMatch(/haggl|lower price/i);
  });

  it("décrit un achat quand le dénouement est achete", () => {
    const p = promptPlan2({ ...episode, plan2: { denouement: "achete", action: "she opens her purse", replique: "Je la prends." } }, blocs);
    expect(p).toMatch(/pays|banknotes|purse/i);
  });

  it("décrit un départ quand le dénouement est repart", () => {
    const p = promptPlan2({ ...episode, plan2: { denouement: "repart", action: "she puts it down", replique: "Je vais réfléchir." } }, blocs);
    expect(p).toMatch(/walks (away|out of frame)|leaves/i);
  });

  it("affirme que la visiteuse reste la seule personne à l'image", () => {
    expect(promptPlan2(episode, blocs)).toMatch(/only person/i);
  });
});

describe("aucune mention du vendeur dans les prompts vidéo", () => {
  it("ne nomme jamais le stallholder, ni dans promptPlan1 ni dans promptPlan2", () => {
    expect(promptPlan1(episode, blocs)).not.toMatch(/stallholder/i);
    expect(promptPlan2(episode, blocs)).not.toMatch(/stallholder/i);
  });
});
