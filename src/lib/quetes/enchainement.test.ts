import { describe, expect, it } from "vitest";
import { sequenceEnchainement, DELAI_AVANT_DIALOGUE_MS } from "@/lib/quetes/enchainement";
import { QUETES_PRINCIPALES } from "@/data/quetesPrincipales";

describe("enchaînement des chapitres", () => {
  it("un chapitre dû produit sa séquence de dialogue", () => {
    const ch = QUETES_PRINCIPALES[0];
    const seq = sequenceEnchainement(ch);
    expect(seq?.id).toBe(`dlg_${ch.id}`);
    expect(seq?.lignes).toEqual(ch.dialogue);
    expect((seq?.lignes ?? []).length).toBeGreaterThan(0);
  });

  it("aucun chapitre dû : rien à armer (trame close)", () => {
    expect(sequenceEnchainement(null)).toBeNull();
  });

  it("le battement est une constante nommée, ajustable", () => {
    expect(DELAI_AVANT_DIALOGUE_MS).toBe(500);
  });
});
