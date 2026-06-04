import { describe, expect, it } from "vitest";
import { selectChatBaladeur, CHAT_BALADEUR_ORDER } from "./chatBaladeur";

describe("selectChatBaladeur", () => {
  it("renvoie null si le chat est sur le fauteuil", () => {
    expect(selectChatBaladeur(0, true)).toBeNull();
    expect(selectChatBaladeur(42, true)).toBeNull();
  });

  it("renvoie le 1er emplacement pour jour 0", () => {
    expect(selectChatBaladeur(0, false)).toBe(CHAT_BALADEUR_ORDER[0]);
  });

  it("renvoie le 2e emplacement pour jour 1", () => {
    expect(selectChatBaladeur(1, false)).toBe(CHAT_BALADEUR_ORDER[1]);
  });

  it("renvoie le 3e emplacement pour jour 2", () => {
    expect(selectChatBaladeur(2, false)).toBe(CHAT_BALADEUR_ORDER[2]);
  });

  it("cycle sur la longueur de l'ordre (jour 3 → 1er)", () => {
    expect(selectChatBaladeur(3, false)).toBe(CHAT_BALADEUR_ORDER[0]);
    expect(selectChatBaladeur(6, false)).toBe(CHAT_BALADEUR_ORDER[0]);
  });
});
