// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Gem } from "lucide-react";
import { PhotoScotchee } from "./PhotoScotchee";

afterEach(cleanup);

describe("PhotoScotchee", () => {
  it("avec un templateId, rend la photo de l'objet", () => {
    render(<PhotoScotchee templateId="ma.lampe_petrole_ancienne" categorie="Maison" taille={64} alt="lampe" />);
    expect(screen.getByAltText("lampe")).toBeTruthy();
    expect(document.querySelector("[data-photo-scotchee='objet']")).toBeTruthy();
    expect(document.querySelector("[data-photo-scotchee='icone']")).toBeNull();
  });

  it("sans templateId mais avec une icône, rend l'icône", () => {
    render(<PhotoScotchee icone={Gem} taille={64} />);
    expect(document.querySelector("[data-photo-scotchee='icone']")).toBeTruthy();
    expect(document.querySelector("[data-photo-scotchee='objet']")).toBeNull();
  });

  it("les deux fournis : la photo l'emporte, sans lever d'erreur", () => {
    render(<PhotoScotchee templateId="ma.lampe_petrole_ancienne" categorie="Maison" icone={Gem} taille={64} alt="lampe" />);
    expect(document.querySelector("[data-photo-scotchee='objet']")).toBeTruthy();
    expect(document.querySelector("[data-photo-scotchee='icone']")).toBeNull();
  });

  it("ni l'un ni l'autre : rend un cadre vide sans lever d'erreur", () => {
    expect(() => render(<PhotoScotchee taille={64} />)).not.toThrow();
    expect(document.querySelector("[data-photo-scotchee='vide']")).toBeTruthy();
  });

  it("accompli affiche la pastille ✓", () => {
    render(<PhotoScotchee icone={Gem} taille={64} accompli />);
    expect(screen.getByText("✓")).toBeTruthy();
  });

  it("aucune couleur bordeaux codée en dur", () => {
    const { container } = render(<PhotoScotchee icone={Gem} taille={64} />);
    expect(container.innerHTML.toLowerCase()).not.toContain("#6e1f1f");
  });

  it("objet pas encore trouvé : la photo est en noir et blanc", () => {
    // Retour device : rien ne distinguait assez une cible trouvée d'une cible
    // qui reste à chiner. La pastille ✓ ne suffisait pas — elle est petite et
    // en coin. La couleur devient le signal principal.
    const { container } = render(
      <PhotoScotchee templateId="ma.lampe_petrole_ancienne" categorie="Maison" taille={64} alt="lampe" />,
    );
    const grise = Array.from(container.querySelectorAll<HTMLElement>("*")).some((n) =>
      n.style.filter.includes("grayscale"),
    );
    expect(grise).toBe(true);
  });

  it("objet trouvé : la photo reprend ses couleurs", () => {
    const { container } = render(
      <PhotoScotchee templateId="ma.lampe_petrole_ancienne" categorie="Maison" taille={64} alt="lampe" accompli />,
    );
    const grise = Array.from(container.querySelectorAll<HTMLElement>("*")).some((n) =>
      n.style.filter.includes("grayscale"),
    );
    expect(grise).toBe(false);
  });

  it("l'icône générique n'est jamais désaturée : elle est déjà à l'encre", () => {
    // Une forme chiffrée (bénéfice, ventes…) n'a rien à « trouver » — la
    // griser n'aurait aucun sens et suggérerait un manque.
    const { container } = render(<PhotoScotchee icone={Gem} taille={64} />);
    const grise = Array.from(container.querySelectorAll<HTMLElement>("*")).some((n) =>
      n.style.filter.includes("grayscale"),
    );
    expect(grise).toBe(false);
  });
});
