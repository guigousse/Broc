// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DialogueOverlay } from "./DialogueOverlay";
import { GRAND_PERE_PORTRAITS, SEQUENCES_TUTORIEL } from "@/data/dialogues";

const seq = SEQUENCES_TUTORIEL.tuto_achat_fait; // 2 lignes

describe("DialogueOverlay", () => {
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
});
