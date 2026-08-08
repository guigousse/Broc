// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DialogueOverlay } from "./DialogueOverlay";
import { GRAND_PERE_PORTRAITS, SEQUENCES_TUTORIEL } from "@/data/dialogues";
import { LangueProvider } from "@/lib/i18n/LangueContext";

const seq = SEQUENCES_TUTORIEL.tuto_retour; // 2 lignes (tuto_achat_fait supprimé, Task 5)

describe("DialogueOverlay", () => {
  afterEach(cleanup);

  it("ne rend rien quand sequence est null", () => {
    const { container } = render(
      <DialogueOverlay sequence={null} nom="Grand-père" portraits={GRAND_PERE_PORTRAITS} onFini={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("affiche la première ligne, avance au tap, appelle onFini après la dernière", async () => {
    const user = userEvent.setup();
    const onFini = vi.fn();
    render(
      <DialogueOverlay sequence={seq} nom="Grand-père" portraits={GRAND_PERE_PORTRAITS} onFini={onFini} />,
    );
    expect(screen.getByText(seq.lignes[0].texte)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /continuer/i }));
    expect(screen.getByText(seq.lignes[1].texte)).toBeTruthy();
    expect(onFini).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /continuer/i }));
    expect(onFini).toHaveBeenCalledTimes(1);
  });

  it("le portrait suit l'humeur de la ligne courante", async () => {
    const user = userEvent.setup();
    render(
      <DialogueOverlay sequence={seq} nom="Grand-père" portraits={GRAND_PERE_PORTRAITS} onFini={vi.fn()} />,
    );
    const srcPortrait = () =>
      document.body.querySelector("img")?.getAttribute("src");

    expect(seq.lignes[0].humeur).toBe("souriant");
    expect(srcPortrait()).toBe(GRAND_PERE_PORTRAITS.souriant);

    await user.click(screen.getByRole("button", { name: /continuer/i }));

    expect(seq.lignes[1].humeur).toBe("songeur");
    expect(srcPortrait()).toBe(GRAND_PERE_PORTRAITS.songeur);
  });

  it("affiche le nom du PNJ dans la carte", () => {
    render(
      <DialogueOverlay sequence={seq} nom="Grand-père" portraits={GRAND_PERE_PORTRAITS} onFini={vi.fn()} />,
    );
    expect(screen.getByText("Grand-père")).toBeTruthy();
  });

  it("le bouton d'avancement porte l'accname localisé", () => {
    localStorage.setItem("projet-broc:langue:v1", JSON.stringify({ locale: "en" }));
    render(
      <LangueProvider>
        <DialogueOverlay sequence={seq} nom="Grand-père" portraits={GRAND_PERE_PORTRAITS} onFini={vi.fn()} />
      </LangueProvider>,
    );
    // Accname = tout le texte du bouton (portrait alt vide + carte + le
    // libellé masqué) : on vérifie juste que "Continue" (EN, mot entier)
    // y apparaît. Le \b reste volontairement défensif, pour ne pas matcher
    // un mot plus long qui contiendrait "continue" comme sous-chaîne.
    expect(screen.getByRole("button", { name: /\bcontinue\b/i })).toBeTruthy();
    localStorage.clear();
  });
});
