// @vitest-environment jsdom
/**
 * Revue du 2026-08-20, constat C1 : le panneau ne connaissait que le QG et le
 * chat baladeur. Sur une clé du Bazar, son `effective()` lisait
 * `QG_LAYOUT.objets["case1"]` → `undefined.left`, donc une exception au
 * premier rendu — l'outil de calage était inutilisable sur `/bazar`.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QgEditPanel } from "./QgEditPanel";
import { QgEditProvider } from "./QgEditContext";
import { CLES_BAZAR, BAZAR_LAYOUT } from "@/components/bazar/bazarLayout";
import { QG_LAYOUT } from "../layout";
import { CHAT_BALADEUR_ORDER } from "@/lib/chatBaladeur";

afterEach(cleanup);

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
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
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
