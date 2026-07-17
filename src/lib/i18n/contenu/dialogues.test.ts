import { describe, expect, it } from "vitest";
import { TOUTES_SEQUENCES } from "@/data/dialogues";
import { QUETES_PRINCIPALES } from "@/data/quetesPrincipales";
import { lignesDialogue, manquants, orphelins } from "./index";
import { DIALOGUES_EN } from "./en/dialogues";
import { DIALOGUES_ES } from "./es/dialogues";

const IDS_TUTORIEL = TOUTES_SEQUENCES.map((s) => s.id);

// SP3 Task 7 : dialogues de délivrance des 12 chapitres de la trame
// (`dlg_trame_chN`). Construits ad hoc par le layout QG (`{ id: `dlg_${ch.id}`,
// lignes: ch.dialogue }`, cf. `src/app/(qg)/layout.tsx`) et résolus par
// `lignesDialogue()` — PAS enregistrés dans `TOUTES_SEQUENCES` (registre
// propre au tutoriel), donc traités à part ici pour ne pas gonfler ce
// registre avec des séquences synthétiques.
const IDS_TRAME = QUETES_PRINCIPALES.map((ch) => `dlg_${ch.id}`);

describe.each([
  ["EN", DIALOGUES_EN, [...IDS_TUTORIEL, ...IDS_TRAME]],
  // SP3 Task 8 : ajouter IDS_TRAME à la ligne ES une fois les 12 dialogues traduits
  ["ES", DIALOGUES_ES, IDS_TUTORIEL],
] as const)("overlay dialogues %s", (_nom, overlay, ids) => {
  it("couvre toutes les séquences, sans orphelin", () => {
    expect(manquants([...ids], overlay)).toEqual([]);
    expect(orphelins([...ids], overlay)).toEqual([]);
  });

  it("a le même nombre de lignes que le FR", () => {
    for (const s of TOUTES_SEQUENCES) {
      expect(overlay[s.id]).toHaveLength(s.lignes.length);
    }
    for (const ch of QUETES_PRINCIPALES) {
      const cle = `dlg_${ch.id}`;
      if (overlay[cle]) expect(overlay[cle]).toHaveLength(ch.dialogue.length);
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
