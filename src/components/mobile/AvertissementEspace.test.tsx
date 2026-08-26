// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { AvertissementEspace, SEUIL_ESPACE_LIBRE_OCTETS } from "./AvertissementEspace";
import { espaceLibre } from "@/lib/storage/pontNatif";

vi.mock("@/lib/storage/pontNatif", async (orig) => ({
  ...(await orig<typeof import("@/lib/storage/pontNatif")>()),
  espaceLibre: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.mocked(espaceLibre).mockReset();
});

describe("AvertissementEspace", () => {
  it("n'avertit pas quand la place est suffisante", async () => {
    vi.mocked(espaceLibre).mockResolvedValue(SEUIL_ESPACE_LIBRE_OCTETS + 1);
    render(<AvertissementEspace />);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("avertit sous le seuil", async () => {
    vi.mocked(espaceLibre).mockResolvedValue(SEUIL_ESPACE_LIBRE_OCTETS - 1);
    render(<AvertissementEspace />);
    expect(await screen.findByRole("dialog")).toBeTruthy();
  });

  it("n'avertit pas quand la plateforme ne sait pas mesurer", async () => {
    // Android, bureau : mieux vaut ne rien dire qu'un chiffre faux.
    vi.mocked(espaceLibre).mockResolvedValue(null);
    render(<AvertissementEspace />);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("ne mesure qu'une fois par lancement", async () => {
    vi.mocked(espaceLibre).mockResolvedValue(1);
    const { rerender } = render(<AvertissementEspace />);
    await screen.findByRole("dialog");
    rerender(<AvertissementEspace />);
    expect(espaceLibre).toHaveBeenCalledTimes(1);
  });

  it("le bouton referme l'avertissement", async () => {
    vi.mocked(espaceLibre).mockResolvedValue(SEUIL_ESPACE_LIBRE_OCTETS - 1);
    render(<AvertissementEspace />);
    await screen.findByRole("dialog");
    const bouton = screen.getByRole("button");
    bouton.click();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("n'avertit pas quand la mesure échoue (rejet de promesse)", async () => {
    vi.mocked(espaceLibre).mockRejectedValue({ genre: "indisponible", message: "x" });
    render(<AvertissementEspace />);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
