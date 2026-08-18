// @vitest-environment jsdom
/**
 * Étagement des étiquettes du curseur de tarification. Elles étaient toutes
 * centrées sur leur pastille, sans se voir les unes les autres : dès que deux
 * repères se rapprochaient, les mots se dessinaient l'un DANS l'autre
 * (« ACHVALEUR ») — et à prix confondus, lettre pour lettre.
 *
 * Chaque étiquette a désormais son étage, compté depuis la pastille :
 * achat (0), valeur (1), prix conseillé (2). La piste ne grandit que du
 * nombre d'étages réellement occupés.
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PrixSlider } from "./PrixSlider";

afterEach(cleanup);

/** L'étiquette est un enfant de sa pastille : on remonte d'un cran. */
function pastilleDe(label: string) {
  return screen.getByText(label).parentElement as HTMLElement;
}

function renderSlider(props: Partial<React.ComponentProps<typeof PrixSlider>> = {}) {
  return render(
    <PrixSlider
      value={113}
      marche={100}
      achat={73}
      onChange={() => {}}
      {...props}
    />,
  );
}

describe("PrixSlider — étagement des étiquettes", () => {
  it("« valeur » monte d'un étage au-dessus d'« achat »", () => {
    renderSlider();
    expect(screen.getByText("achat").style.bottom).toBe("calc(100% + 3px)");
    expect(screen.getByText("valeur").style.bottom).toBe("calc(100% + 16px)");
  });

  it("« prix conseillé » prend le troisième étage, au-dessus des deux autres", () => {
    renderSlider({ cible: 105 });
    expect(screen.getByText("Prix conseillé").style.bottom).toBe(
      "calc(100% + 29px)",
    );
  });

  it("« vente » reste sous la piste, seule de son côté", () => {
    renderSlider();
    expect(screen.getByText("vente").style.top).toBe("calc(100% + 3px)");
  });
});

describe("PrixSlider — la piste ne grandit que du nécessaire", () => {
  it("valeur masquée : un seul étage, géométrie d'origine", () => {
    renderSlider({ marcheConnu: false });
    expect(pastilleDe("achat").style.top).toBe("32px");
  });

  it("achat + valeur : deux étages", () => {
    renderSlider();
    expect(pastilleDe("achat").style.top).toBe("45px");
  });

  it("tutoriel guidé : trois étages", () => {
    renderSlider({ cible: 105 });
    expect(pastilleDe("achat").style.top).toBe("58px");
  });
});

describe("PrixSlider — flèches d'invite sur la poignée de vente", () => {
  it("pose les flèches fixes quand la poignée se glisse", () => {
    renderSlider();
    expect(pastilleDe("vente").className).toContain("nego-fleches");
    expect(pastilleDe("vente").className).not.toContain("tuto-fleches");
  });

  it("aucune flèche sur une poignée verrouillée par le grand-père", () => {
    renderSlider({ readOnly: true });
    expect(pastilleDe("vente").className).toBe("");
  });

  it("le tutoriel garde ses flèches animées", () => {
    renderSlider({ tutoFleches: true });
    expect(pastilleDe("vente").className).toContain("tuto-fleches");
    expect(pastilleDe("vente").className).not.toContain("nego-fleches");
  });

  it("coupe la flèche du côté où la poignée touche le bout de l'échelle", () => {
    renderSlider({ value: 1 });
    expect(pastilleDe("vente").className).toContain("fleches-sans-gauche");
    expect(pastilleDe("vente").className).not.toContain("fleches-sans-droite");
    cleanup();
    renderSlider({ value: 200 });
    expect(pastilleDe("vente").className).toContain("fleches-sans-droite");
    expect(pastilleDe("vente").className).not.toContain("fleches-sans-gauche");
  });

  it("les deux flèches restent en place au milieu de l'échelle", () => {
    renderSlider({ value: 100 });
    expect(pastilleDe("vente").className).not.toContain("fleches-sans");
  });
});
