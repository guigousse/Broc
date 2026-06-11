// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { ToastProvider, useToast } from "./Toast";

/** Petit consommateur : un bouton qui déclenche un toast au clic. */
function Declencheur({
  message,
  type,
}: {
  message: string;
  type?: "succes" | "info" | "erreur";
}) {
  const { toast } = useToast();
  return (
    <button type="button" onClick={() => toast(message, type ? { type } : undefined)}>
      déclencher
    </button>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Toast", () => {
  it("le conteneur role=status / aria-live est toujours monté", () => {
    render(
      <ToastProvider>
        <div>contenu</div>
      </ToastProvider>,
    );
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.textContent).toBe("");
  });

  it("toast() affiche le message dans le conteneur status", () => {
    render(
      <ToastProvider>
        <Declencheur message="Objet vendu !" />
      </ToastProvider>,
    );
    act(() => {
      screen.getByRole("button", { name: "déclencher" }).click();
    });
    expect(screen.getByRole("status").textContent).toBe("Objet vendu !");
  });

  it("le toast disparaît après 2,5 s", () => {
    render(
      <ToastProvider>
        <Declencheur message="Éphémère" />
      </ToastProvider>,
    );
    act(() => {
      screen.getByRole("button", { name: "déclencher" }).click();
    });
    expect(screen.getByRole("status").textContent).toBe("Éphémère");

    // Juste avant l'échéance : toujours visible.
    act(() => {
      vi.advanceTimersByTime(2499);
    });
    expect(screen.getByRole("status").textContent).toBe("Éphémère");

    // À 2500 ms : disparu.
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("un nouveau toast remplace le précédent et repart pour 2,5 s", () => {
    render(
      <ToastProvider>
        <Declencheur message="Premier" />
      </ToastProvider>,
    );
    const btn = screen.getByRole("button", { name: "déclencher" });
    act(() => {
      btn.click();
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    // Re-déclenche à t=2000 : le timer initial est annulé.
    act(() => {
      btn.click();
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    // t=4000 : sans reset, le toast aurait disparu à t=2500.
    expect(screen.getByRole("status").textContent).toBe("Premier");
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("useToast hors provider lève une erreur explicite", () => {
    // Silencie le rapport d'erreur de React pendant le rend raté attendu.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Declencheur message="x" />)).toThrow(
      /ToastProvider/,
    );
    spy.mockRestore();
  });
});
