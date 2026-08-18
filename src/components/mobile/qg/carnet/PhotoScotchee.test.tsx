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
});
