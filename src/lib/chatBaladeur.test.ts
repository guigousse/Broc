import { describe, expect, it } from "vitest";
import { selectChatBaladeur, CHAT_BALADEUR_ORDER } from "./chatBaladeur";

describe("selectChatBaladeur", () => {
  it("ne connaît plus que la fenêtre du bureau", () => {
    expect(CHAT_BALADEUR_ORDER).toEqual(["qg-fenetre"]);
  });

  it("renvoie null si le chat est sur le fauteuil", () => {
    expect(selectChatBaladeur(0, true)).toBeNull();
    expect(selectChatBaladeur(42, true)).toBeNull();
  });

  it("renvoie la fenêtre du bureau tous les jours sinon", () => {
    expect(selectChatBaladeur(0, false)).toBe("qg-fenetre");
    expect(selectChatBaladeur(1, false)).toBe("qg-fenetre");
    expect(selectChatBaladeur(7, false)).toBe("qg-fenetre");
  });
});
