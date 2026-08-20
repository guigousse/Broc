// @vitest-environment jsdom
/**
 * Revue du 2026-08-20, constat C1 : le panneau ne connaissait que le QG et le
 * chat baladeur. Sur une clé du Bazar, son `effective()` lisait
 * `QG_LAYOUT.objets["case1"]` → `undefined.left`, donc une exception au
 * premier rendu — l'outil de calage était inutilisable sur `/bazar`.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QgEditPanel } from "./QgEditPanel";
import { QgEditProvider } from "./QgEditContext";
import { CLES_BAZAR, BAZAR_LAYOUT } from "@/components/bazar/bazarLayout";
import { QG_LAYOUT } from "../layout";
import { CHAT_BALADEUR_ORDER } from "@/lib/chatBaladeur";

afterEach(() => {
  cleanup();
  poserPressePapiers(undefined);
});

/**
 * Remplace `navigator.clipboard` — ou le retire tout à fait avec `undefined`,
 * ce qui est l'état RÉEL de Safari sur du HTTP simple, celui par lequel
 * l'auteur atteint le serveur de dev depuis son téléphone.
 *
 * `defineProperty` et pas une affectation : `navigator.clipboard` est un
 * accesseur en lecture seule sur le prototype.
 */
function poserPressePapiers(valeur: unknown) {
  Object.defineProperty(navigator, "clipboard", {
    value: valeur,
    configurable: true,
  });
}

function monter(cles?: typeof CLES_BAZAR) {
  return render(
    <QgEditProvider enabled>
      <QgEditPanel cles={cles} />
    </QgEditProvider>,
  );
}

describe("QgEditPanel", () => {
  it("liste les clés du Bazar sans exploser", () => {
    monter(CLES_BAZAR);
    for (const cle of CLES_BAZAR) {
      expect(screen.getByText(cle)).toBeTruthy();
    }
    expect(screen.getByText("// Bazar")).toBeTruthy();
  });

  it("affiche la coordonnée authorée de chaque clé du Bazar", () => {
    const { container } = monter(CLES_BAZAR);
    const texte = container.textContent ?? "";
    const c = BAZAR_LAYOUT.objets.case1;
    expect(texte).toContain(
      `case1: { left: ${c.left.toFixed(1)}, bottom: ${c.bottom.toFixed(1)}, width: ${c.width.toFixed(1)} },`,
    );
  });

  it("compose l'extrait à recopier sur les clés du Bazar — le chemin qui levait `undefined.left`", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    poserPressePapiers({ writeText });
    monter(CLES_BAZAR);
    fireEvent.click(screen.getByRole("button", { name: "Copier" }));
    expect(writeText).toHaveBeenCalledTimes(1);
    const extrait = writeText.mock.calls[0][0] as string;
    const c = BAZAR_LAYOUT.objets.sortie;
    expect(extrait).toContain("// Bazar");
    expect(extrait).toContain(
      `    sortie: { left: ${c.left.toFixed(1)}, bottom: ${c.bottom.toFixed(1)}, width: ${c.width.toFixed(1)} },`,
    );
  });

  // ── Panne relevée sur téléphone le 2026-08-20 ──────────────────────────
  // L'auteur cale les scènes depuis son téléphone, sur le serveur de dev servi
  // en HTTP simple. Safari n'expose PAS `navigator.clipboard` hors contexte
  // sécurisé : `navigator.clipboard.writeText(...)` levait `undefined is not
  // an object` avant même d'atteindre son `.catch()`. Le clic ne faisait rien,
  // et les coordonnées qu'il venait de poser étaient irrécupérables.
  describe("le presse-papiers manque (HTTP simple, Safari)", () => {
    it("le clic ne lève pas, et retombe sur une zone de texte à copier à la main", () => {
      poserPressePapiers(undefined);
      monter(CLES_BAZAR);
      expect(() =>
        fireEvent.click(screen.getByRole("button", { name: "Copier" })),
      ).not.toThrow();
      const zone = screen.getByRole("textbox") as HTMLTextAreaElement;
      expect(zone.value).toContain("// Bazar");
      expect(zone.value).toContain("case1: { left:");
    });

    it("le texte de repli est DÉJÀ sélectionné : plus rien à faire à la loupe", () => {
      poserPressePapiers(undefined);
      monter(CLES_BAZAR);
      fireEvent.click(screen.getByRole("button", { name: "Copier" }));
      const zone = screen.getByRole("textbox") as HTMLTextAreaElement;
      expect(document.activeElement).toBe(zone);
      expect(zone.selectionStart).toBe(0);
      expect(zone.selectionEnd).toBe(zone.value.length);
    });

    it("le panneau dit lequel des deux chemins a été pris", () => {
      poserPressePapiers(undefined);
      monter(CLES_BAZAR);
      fireEvent.click(screen.getByRole("button", { name: "Copier" }));
      expect(screen.getByRole("status").textContent).toContain(
        "Presse-papiers indisponible",
      );
    });

    it("un presse-papiers qui REFUSE (promesse rejetée) replie pareil", async () => {
      poserPressePapiers({ writeText: vi.fn().mockRejectedValue(new Error("refus")) });
      monter(CLES_BAZAR);
      fireEvent.click(screen.getByRole("button", { name: "Copier" }));
      // Laisser la microtâche du rejet se dérouler.
      await act(async () => {});
      expect(screen.getByRole("textbox")).toBeTruthy();
      expect(screen.getByRole("status").textContent).toContain(
        "Presse-papiers indisponible",
      );
    });
  });

  it("le presse-papiers marche : rien à recopier à la main, et le panneau le dit", async () => {
    poserPressePapiers({ writeText: vi.fn().mockResolvedValue(undefined) });
    monter(CLES_BAZAR);
    fireEvent.click(screen.getByRole("button", { name: "Copier" }));
    await act(async () => {});
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("Copié");
  });

  it("sans liste de clés, il garde le comportement du QG (objets + chat)", () => {
    monter();
    expect(screen.getByText("// QG objets")).toBeTruthy();
    expect(screen.getByText("// Chat baladeur")).toBeTruthy();
    expect(screen.queryByText("// Bazar")).toBeNull();
    expect(screen.getByText(Object.keys(QG_LAYOUT.objets)[0])).toBeTruthy();
    expect(screen.getByText(CHAT_BALADEUR_ORDER[0])).toBeTruthy();
    // Aucune clé du Bazar ne s'invite sur la scène du QG : elle n'y aurait pas
    // de cadre.
    expect(screen.queryByText("case1")).toBeNull();
  });
});
