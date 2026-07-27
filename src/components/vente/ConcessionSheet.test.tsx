// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ConcessionSheet } from "./ConcessionSheet";
import { CAMIONS } from "@/data/camion";

afterEach(cleanup);

const ROGERS = CAMIONS[0]; // coffre petit
const BREAK = CAMIONS[1]; // coffre moyen, 200 €
const UTILITAIRE = CAMIONS[2]; // coffre grand, 500 €

function poser(
  budget: number,
  onAcheter = vi.fn(),
  actuel = ROGERS,
  prochain = BREAK,
) {
  render(
    <ConcessionSheet
      open
      onClose={() => {}}
      actuel={actuel}
      prochain={prochain}
      budget={budget}
      onAcheter={onAcheter}
    />,
  );
  return onAcheter;
}

describe("ConcessionSheet", () => {
  it("montre les deux véhicules de profil, l'actuel puis le visé", () => {
    const { container } = render(
      <ConcessionSheet
        open
        onClose={() => {}}
        actuel={ROGERS}
        prochain={BREAK}
        budget={500}
        onAcheter={() => {}}
      />,
    );
    const srcs = [...container.querySelectorAll("img")].map((i) =>
      i.getAttribute("src"),
    );
    expect(srcs).toEqual([
      "/coffre/rogers-profil.webp",
      "/coffre/break-profil.webp",
    ]);
  });

  it("annonce la taille de coffre VISÉE, pas celle qu'on possède", () => {
    poser(500);
    expect(screen.getByText("Coffre moyen")).toBeTruthy();
    // La taille actuelle n'est pas affichée : c'est ce qu'on obtient qui
    // intéresse le joueur, et les deux profils disent déjà le reste.
    expect(screen.queryByText("Petit coffre")).toBeNull();
  });

  it("le palier suivant change le libellé de taille", () => {
    poser(500, vi.fn(), BREAK, UTILITAIRE);
    expect(screen.getByText("Grand coffre")).toBeTruthy();
  });

  it("n'annonce plus de nombre de places : le rapport n'est pas linéaire", () => {
    poser(500);
    expect(screen.queryByText(/places/)).toBeNull();
  });

  it("au budget exact : bouton actif, achat transmis", () => {
    const onAcheter = poser(200);
    const bouton = screen.getByRole("button", { name: "Acheter · 200 €" });
    expect(bouton.hasAttribute("disabled")).toBe(false);
    fireEvent.click(bouton);
    expect(onAcheter).toHaveBeenCalledTimes(1);
  });

  it("sous le prix : bouton bloqué, sans reproche sur la somme manquante", () => {
    const onAcheter = poser(160);
    const bouton = screen.getByRole("button", { name: "Acheter · 200 €" });
    expect(bouton.hasAttribute("disabled")).toBe(true);
    // Le bouton grisé porte déjà le prix : rappeler ce qui manque n'ajoutait
    // rien et sonnait comme un reproche.
    expect(screen.queryByText(/manque/i)).toBeNull();
    fireEvent.click(bouton);
    expect(onAcheter).not.toHaveBeenCalled();
  });

  it("fermée : ne rend pas son contenu", () => {
    render(
      <ConcessionSheet
        open={false}
        onClose={() => {}}
        actuel={ROGERS}
        prochain={BREAK}
        budget={500}
        onAcheter={() => {}}
      />,
    );
    expect(screen.queryByText("+7 places")).toBeNull();
  });
});
