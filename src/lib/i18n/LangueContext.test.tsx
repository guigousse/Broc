// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LangueProvider, useLangue } from "@/lib/i18n/LangueContext";

function Sonde() {
  const { locale, setLocale, d } = useLangue();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="label">{d.menu.nouvellePartie}</span>
      <button onClick={() => setLocale("es")}>vers-es</button>
    </div>
  );
}

describe("LangueContext", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.stubGlobal("navigator", { language: "fr-FR" });
  });

  afterEach(() => {
    cleanup();
  });

  it("sans provider : valeur par défaut française", () => {
    render(<Sonde />);
    expect(screen.getByTestId("locale").textContent).toBe("fr");
    expect(screen.getByTestId("label").textContent).toBe("Nouvelle partie");
  });

  it("avec provider : détecte la langue puis bascule à chaud et persiste", () => {
    render(
      <LangueProvider>
        <Sonde />
      </LangueProvider>,
    );
    expect(screen.getByTestId("locale").textContent).toBe("fr");

    fireEvent.click(screen.getByText("vers-es"));
    expect(screen.getByTestId("label").textContent).toBe("Nueva partida");
    expect(
      JSON.parse(localStorage.getItem("projet-broc:langue:v1")!).locale,
    ).toBe("es");
    expect(document.documentElement.lang).toBe("es");
  });
});
