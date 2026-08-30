// @vitest-environment jsdom
/**
 * Task 14 — sheet « Mes albums » ouverte depuis le livre de comptes du
 * bureau (`QgCarnet`). Deux boutons, un par album : actif s'il est acheté,
 * désactivé avec le suffixe « — Au Bazar » sinon (l'achat se fait au Bazar,
 * pas ici).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AlbumsSheet } from "./AlbumsSheet";
import { initAlbums } from "@/lib/albums";
import type { AlbumsState } from "@/types/game";

afterEach(cleanup);

describe("AlbumsSheet", () => {
  it("seul le classeur acheté : son bouton est actif, l'album de timbres est désactivé avec « — Au Bazar »", () => {
    const albums: AlbumsState = {
      ...initAlbums(),
      classeur: { achete: true, pieces: {}, nouvelles: [] },
    };
    const onOuvrir = vi.fn();
    render(
      <AlbumsSheet open onClose={() => {}} albums={albums} onOuvrir={onOuvrir} />,
    );

    const boutonClasseur = screen.getByRole("button", {
      name: "Classeur de cartes",
    }) as HTMLButtonElement;
    expect(boutonClasseur.disabled).toBe(false);
    fireEvent.click(boutonClasseur);
    expect(onOuvrir).toHaveBeenCalledWith("classeur");

    const boutonAlbum = screen.getByRole("button", {
      name: "Album de timbres — Au Bazar",
    }) as HTMLButtonElement;
    expect(boutonAlbum.disabled).toBe(true);
  });

  it("les deux albums achetés : les deux boutons sont actifs", () => {
    const albums: AlbumsState = {
      classeur: { achete: true, pieces: {}, nouvelles: [] },
      timbres: { achete: true, pieces: {}, nouvelles: [], placements: {}, ordreZ: [] },
    };
    const onOuvrir = vi.fn();
    render(
      <AlbumsSheet open onClose={() => {}} albums={albums} onOuvrir={onOuvrir} />,
    );

    expect(
      (screen.getByRole("button", { name: "Classeur de cartes" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    const boutonAlbum = screen.getByRole("button", {
      name: "Album de timbres",
    }) as HTMLButtonElement;
    expect(boutonAlbum.disabled).toBe(false);
    fireEvent.click(boutonAlbum);
    expect(onOuvrir).toHaveBeenCalledWith("timbres");
  });

  it("fermée, ne rend rien", () => {
    render(
      <AlbumsSheet open={false} onClose={() => {}} albums={initAlbums()} onOuvrir={vi.fn()} />,
    );
    expect(screen.queryByRole("button")).toBeNull();
  });
});
