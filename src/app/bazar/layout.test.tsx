// @vitest-environment jsdom
/**
 * Revue du 2026-08-20, constat C1 — le plus lourd de la revue.
 *
 * `QgEditProvider` n'était monté que dans `src/app/(qg)/layout.tsx`. `/bazar`
 * vit HORS du groupe de routes `(qg)` et n'avait pas de layout : le contexte y
 * était `null`, `QgEditOverlay` rendait `null` (`!ctx?.enabled`), et
 * `http://localhost:3100/bazar?qgedit=1` n'affichait rien du tout — la passe
 * de calage à la souris du décor était impossible.
 *
 * Ces tests verrouillent les deux moitiés du contrat : l'outil s'allume en
 * développement, et il reste éteint dès que `OUTILS_DEV` est faux (build de
 * production), quoi que dise l'URL ou le localStorage.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

// `OUTILS_DEV` vaut `process.env.NODE_ENV === "development"`, donc `false`
// sous vitest. Un getter permet de le basculer test par test.
const outils = { OUTILS_DEV: true };
vi.mock("@/lib/outilsDev", () => ({
  get OUTILS_DEV() {
    return outils.OUTILS_DEV;
  },
}));

import BazarLayout from "./layout";
import { QgEditOverlay } from "@/components/mobile/qg/dev/QgEditOverlay";
import { CLES_BAZAR } from "@/components/bazar/bazarLayout";

function allerA(url: string) {
  window.history.replaceState({}, "", url);
}

beforeEach(() => {
  outils.OUTILS_DEV = true;
  window.localStorage.clear();
  allerA("/bazar");
});

afterEach(cleanup);

describe("layout de /bazar — le fournisseur du mode calage", () => {
  it("rend toujours la page qu'il enveloppe", () => {
    render(
      <BazarLayout>
        <div data-testid="page" />
      </BazarLayout>,
    );
    expect(screen.getByTestId("page")).toBeTruthy();
  });

  it("sans ?qgedit, aucun panneau et aucun cadre", () => {
    render(
      <BazarLayout>
        <QgEditOverlay cles={CLES_BAZAR} />
      </BazarLayout>,
    );
    expect(screen.queryByText(/Bazar edit/)).toBeNull();
    expect(screen.queryByText("case1")).toBeNull();
  });

  it("avec ?qgedit=1, le panneau ET les cadres du Bazar apparaissent", () => {
    allerA("/bazar?qgedit=1");
    render(
      <BazarLayout>
        <QgEditOverlay cles={CLES_BAZAR} />
      </BazarLayout>,
    );
    // Le panneau, avec une ligne par clé du Bazar.
    expect(screen.getByText("Bazar edit mode")).toBeTruthy();
    // Les cadres pointillés de l'overlay : chaque clé apparaît donc deux fois
    // (étiquette du cadre + ligne du panneau).
    for (const cle of CLES_BAZAR) {
      expect(screen.getAllByText(cle).length).toBe(2);
    }
  });

  it("?qgedit=1 persiste : la navigation suivante garde l'outil allumé", () => {
    allerA("/bazar?qgedit=1");
    const premier = render(<BazarLayout>{null}</BazarLayout>);
    expect(screen.getByText("Bazar edit mode")).toBeTruthy();
    premier.unmount();

    allerA("/bazar");
    render(<BazarLayout>{null}</BazarLayout>);
    expect(screen.getByText("Bazar edit mode")).toBeTruthy();
  });

  it("?qgedit=0 éteint l'outil et efface la clé", () => {
    window.localStorage.setItem("broc.qg-edit.enabled", "1");
    allerA("/bazar?qgedit=0");
    render(<BazarLayout>{null}</BazarLayout>);
    expect(screen.queryByText("Bazar edit mode")).toBeNull();
    expect(window.localStorage.getItem("broc.qg-edit.enabled")).toBeNull();
  });

  it("hors développement, ni l'URL ni le localStorage ne rallument l'outil", () => {
    outils.OUTILS_DEV = false;
    window.localStorage.setItem("broc.qg-edit.enabled", "1");
    allerA("/bazar?qgedit=1");
    render(
      <BazarLayout>
        <QgEditOverlay cles={CLES_BAZAR} />
      </BazarLayout>,
    );
    expect(screen.queryByText(/Bazar edit/)).toBeNull();
    expect(screen.queryByText("case1")).toBeNull();
  });
});
