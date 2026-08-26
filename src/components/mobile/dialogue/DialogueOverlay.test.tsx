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

  /**
   * LES LIGNES FOURNIES PAR L'APPELANT (2026-08-26). Le tenancier du Bazar
   * s'en sert : sa dernière réplique porte un délai à mettre en gras, donc du
   * balisage, que le contenu scénarisé — de simples chaînes — ne sait pas
   * transporter. Quand l'appelant fournit ses lignes, l'overlay les affiche
   * telles quelles et ne va plus les chercher dans la séquence.
   */
  describe("lignes fournies par l'appelant", () => {
    it("affiche les lignes reçues plutôt que celles de la séquence", async () => {
      const user = userEvent.setup();
      const onFini = vi.fn();
      render(
        <DialogueOverlay
          sequence={seq}
          nom="Le Joueur du Vide-grenier"
          portraits={GRAND_PERE_PORTRAITS}
          lignes={["Bonjour à vous.", <span key="d">dans <strong>4 j</strong></span>]}
          onFini={onFini}
        />,
      );
      expect(screen.getByText("Bonjour à vous.")).toBeTruthy();
      expect(screen.queryByText(seq.lignes[0].texte)).toBeNull();
      await user.click(screen.getByRole("button", { name: /continuer/i }));
      // Le balisage arrive intact : le délai est bien en gras.
      expect(screen.getByText("4 j").tagName).toBe("STRONG");
      await user.click(screen.getByRole("button", { name: /continuer/i }));
      expect(onFini).toHaveBeenCalledTimes(1);
    });

    // Le compte des lignes vient alors de l'appelant, pas de la séquence :
    // sinon l'overlay refermerait trop tôt, ou tournerait dans le vide.
    it("compte les lignes reçues, pas celles de la séquence", async () => {
      const user = userEvent.setup();
      const onFini = vi.fn();
      render(
        <DialogueOverlay
          sequence={seq}
          nom="Le Joueur du Vide-grenier"
          portraits={GRAND_PERE_PORTRAITS}
          lignes={["Une seule ligne."]}
          onFini={onFini}
        />,
      );
      await user.click(screen.getByRole("button", { name: /continuer/i }));
      expect(onFini).toHaveBeenCalledTimes(1);
    });
  });
});