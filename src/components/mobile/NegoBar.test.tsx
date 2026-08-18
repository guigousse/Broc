// @vitest-environment jsdom
/**
 * Pastille « achat » de la barre de négociation (vente) : repère fixe non
 * interactif à la position du prix d'achat, comme sur le PrixSlider de la
 * tarification. Absente quand la prop n'est pas fournie (mode chine) ou
 * vaut null (panier dont un objet n'a pas de prix d'achat connu).
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NegoBar } from "./NegoBar";
import type { ComponentProps } from "react";

afterEach(cleanup);

function renderBar(props: Partial<ComponentProps<typeof NegoBar>> = {}) {
  return render(
    <NegoBar
      mode="vente"
      echelleMax={100}
      prixAdverse={40}
      prixJoueur={80}
      minJoueur={40}
      maxJoueur={100}
      onChangeJoueur={() => {}}
      {...props}
    />,
  );
}

describe("NegoBar — pastille achat", () => {
  it("affiche le repère fixe au prix d'achat quand la prop est fournie", () => {
    renderBar({ achat: 10 });
    expect(screen.getByText("10€")).toBeTruthy();
    expect(screen.getByText("achat")).toBeTruthy();
  });

  it("n'affiche rien sans prix d'achat (prop absente ou null)", () => {
    renderBar();
    expect(screen.queryByText("achat")).toBeNull();
    cleanup();
    renderBar({ achat: null });
    expect(screen.queryByText("achat")).toBeNull();
  });

  it("n'affiche rien pour un prix d'achat de 0 (objet du colis)", () => {
    renderBar({ achat: 0 });
    expect(screen.queryByText("achat")).toBeNull();
  });
});

describe("NegoBar — accord de la pastille adverse", () => {
  it("accorde au féminin quand la personne en face est une dame", () => {
    renderBar({ genreAdverse: "f" });
    expect(screen.getByText("Elle")).toBeTruthy();
    expect(screen.queryByText("Lui")).toBeNull();
  });

  it("accorde au masculin", () => {
    renderBar({ genreAdverse: "m" });
    expect(screen.getByText("Lui")).toBeTruthy();
    expect(screen.queryByText("Elle")).toBeNull();
  });

  it("met au pluriel les groupes et les duos", () => {
    renderBar({ genreAdverse: "n" });
    expect(screen.getByText("Eux")).toBeTruthy();
  });

  it("retombe au masculin quand le genre n'est pas fourni", () => {
    renderBar();
    expect(screen.getByText("Lui")).toBeTruthy();
  });
});

describe("NegoBar — dernier prix du vendeur", () => {
  it("retire le curseur du joueur du DOM", () => {
    renderBar({ genreAdverse: "m", dernierPrix: true });
    expect(screen.queryByText("Vous")).toBeNull();
    expect(screen.queryByText("80€")).toBeNull();
  });

  it("garde le curseur adverse, étiqueté « prix final »", () => {
    renderBar({ genreAdverse: "m", dernierPrix: true });
    expect(screen.getByText("40€")).toBeTruthy();
    expect(screen.getByText("prix final")).toBeTruthy();
  });

  it("l'étiquette remplace l'accord de genre", () => {
    renderBar({ genreAdverse: "f", dernierPrix: true });
    expect(screen.queryByText("Elle")).toBeNull();
    expect(screen.queryByText("Lui")).toBeNull();
  });

  it("hors de cet état, les deux curseurs restent en place", () => {
    renderBar();
    expect(screen.getByText("Vous")).toBeTruthy();
    expect(screen.getByText("80€")).toBeTruthy();
    expect(screen.queryByText("prix final")).toBeNull();
  });
});

describe("NegoBar — flèches d'invite autour du curseur joueur", () => {
  it("pose les flèches fixes dès que le curseur est manipulable", () => {
    const { container } = renderBar();
    expect(container.querySelector(".nego-fleches")).toBeTruthy();
    expect(container.querySelector(".tuto-fleches")).toBeNull();
  });

  it("aucune flèche quand la barre est en lecture seule", () => {
    const { container } = renderBar({ readOnly: true });
    expect(container.querySelector(".nego-fleches")).toBeNull();
    expect(container.querySelector(".tuto-fleches")).toBeNull();
  });

  it("le tutoriel garde ses flèches animées, sans cumuler les deux classes", () => {
    const { container } = renderBar({ tutoMainJoueur: true });
    expect(container.querySelector(".tuto-fleches")).toBeTruthy();
    expect(container.querySelector(".nego-fleches")).toBeNull();
  });

  it("rien au prix final : il n'y a plus de curseur joueur à désigner", () => {
    const { container } = renderBar({ dernierPrix: true });
    expect(container.querySelector(".nego-fleches")).toBeNull();
  });
});

describe("NegoBar — flèches coupées au bord de l'échelle", () => {
  it("coupe la flèche gauche quand le curseur touche le bas de l'échelle", () => {
    const { container } = renderBar({ prixJoueur: 0, minJoueur: 0 });
    const cible = container.querySelector(".nego-fleches") as HTMLElement;
    expect(cible.className).toContain("fleches-sans-gauche");
    expect(cible.className).not.toContain("fleches-sans-droite");
  });

  it("coupe la flèche droite quand il touche le haut", () => {
    const { container } = renderBar({ prixJoueur: 100 });
    const cible = container.querySelector(".nego-fleches") as HTMLElement;
    expect(cible.className).toContain("fleches-sans-droite");
    expect(cible.className).not.toContain("fleches-sans-gauche");
  });

  it("garde les deux flèches partout ailleurs", () => {
    const { container } = renderBar({ prixJoueur: 50 });
    const cible = container.querySelector(".nego-fleches") as HTMLElement;
    expect(cible.className).not.toContain("fleches-sans");
  });
});
