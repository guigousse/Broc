// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmModal } from "./ConfirmModal";

afterEach(cleanup);

function renderModal(
  props: Partial<React.ComponentProps<typeof ConfirmModal>> = {},
) {
  const onClose = vi.fn();
  const onConfirm = vi.fn();
  const utils = render(
    <ConfirmModal
      open
      onClose={onClose}
      onConfirm={onConfirm}
      titre="Vider l'atelier"
      {...props}
    >
      Êtes-vous sûr ?
    </ConfirmModal>,
  );
  return { onClose, onConfirm, ...utils };
}

describe("ConfirmModal", () => {
  it("ne rend rien quand open est false", () => {
    renderModal({ open: false });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("affiche titre, corps et boutons quand open est true", () => {
    renderModal();
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-label")).toBe("Vider l'atelier");
    expect(screen.getByText("Êtes-vous sûr ?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirmer" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Annuler" })).toBeTruthy();
  });

  it("respecte confirmLabel et cancelLabel personnalisés", () => {
    renderModal({ confirmLabel: "Oui, vider", cancelLabel: "Non" });
    expect(screen.getByRole("button", { name: "Oui, vider" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Non" })).toBeTruthy();
  });

  it("clic sur Confirmer appelle onConfirm puis onClose", async () => {
    const user = userEvent.setup();
    const { onClose, onConfirm } = renderModal();
    await user.click(screen.getByRole("button", { name: "Confirmer" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    // onConfirm est appelé avant la fermeture.
    expect(onConfirm.mock.invocationCallOrder[0]).toBeLessThan(
      onClose.mock.invocationCallOrder[0],
    );
  });

  it("clic sur Annuler appelle onClose sans onConfirm", async () => {
    const user = userEvent.setup();
    const { onClose, onConfirm } = renderModal();
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("clic sur le backdrop ferme la modale", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();
    await user.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clic à l'intérieur de la carte ne ferme pas", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();
    await user.click(screen.getByText("Êtes-vous sûr ?"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("variante danger : le bouton de confirmation change de style", () => {
    renderModal({ danger: true });
    const confirmDanger = screen
      .getByRole("button", { name: "Confirmer" })
      .getAttribute("style");
    cleanup();
    renderModal({ danger: false });
    const confirmPrimary = screen
      .getByRole("button", { name: "Confirmer" })
      .getAttribute("style");
    expect(confirmDanger).toContain("vermillion");
    expect(confirmDanger).not.toBe(confirmPrimary);
  });
});
