// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BrocanteFrame } from "./BrocanteFrame";

afterEach(cleanup);

const baseProps = {
  brocanteId: "vide-grenier-quartier",
  nom: "Vide-grenier du quartier",
  coord: { id: "vide-grenier-quartier", left: "6%", top: "28%", width: "16%", height: "32%" },
};

describe("BrocanteFrame", () => {
  it("appelle onSelect au clic", () => {
    const onSelect = vi.fn();
    render(
      <BrocanteFrame {...baseProps} selected={false} debloquee onSelect={onSelect} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /vide-grenier du quartier/i }));
    expect(onSelect).toHaveBeenCalledWith("vide-grenier-quartier");
  });

  it("ajoute aria-pressed=true quand sélectionné", () => {
    render(
      <BrocanteFrame {...baseProps} selected debloquee onSelect={() => {}} />,
    );
    expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe("true");
  });

  it("ajoute aria-disabled quand verrouillée mais reste cliquable", () => {
    const onSelect = vi.fn();
    render(
      <BrocanteFrame {...baseProps} selected={false} debloquee={false} onSelect={onSelect} />,
    );
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(btn);
    expect(onSelect).toHaveBeenCalledWith("vide-grenier-quartier");
  });
});
