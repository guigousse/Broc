import { describe, expect, it } from "vitest";
import { TOUTES_SEQUENCES } from "@/data/dialogues";
import { lignesDialogue, manquants, orphelins } from "./index";
import { DIALOGUES_EN } from "./en/dialogues";
import { DIALOGUES_ES } from "./es/dialogues";

const IDS = TOUTES_SEQUENCES.map((s) => s.id);

describe.each([
  ["EN", DIALOGUES_EN],
  ["ES", DIALOGUES_ES],
] as const)("overlay dialogues %s", (_nom, overlay) => {
  it("couvre toutes les séquences, sans orphelin", () => {
    expect(manquants(IDS, overlay)).toEqual([]);
    expect(orphelins(IDS, overlay)).toEqual([]);
  });

  it("a le même nombre de lignes que le FR", () => {
    for (const s of TOUTES_SEQUENCES) {
      expect(overlay[s.id]).toHaveLength(s.lignes.length);
    }
  });
});

describe("lignesDialogue", () => {
  const seq = TOUTES_SEQUENCES[0];
  it("FR = textes du payload", () => {
    expect(lignesDialogue(seq, "fr")).toEqual(seq.lignes.map((l) => l.texte));
  });
  it("EN = overlay", () => {
    expect(lignesDialogue(seq, "en")).toEqual(DIALOGUES_EN[seq.id]);
  });
});
