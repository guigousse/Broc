// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CalendarDays } from "lucide-react";
import { SectionRetractable } from "./SectionRetractable";

afterEach(cleanup);

const base = {
  cle: "quotidiennes" as const,
  icone: CalendarDays,
  titre: "QUÊTES DU JOUR",
  onBasculer: () => {},
};

describe("SectionRetractable", () => {
  it("dépliée : le contenu est rendu, aria-expanded vrai", () => {
    render(<SectionRetractable {...base} repliee={false}><p>contenu</p></SectionRetractable>);
    expect(screen.getByText("contenu")).toBeTruthy();
    expect(screen.getByRole("button").getAttribute("aria-expanded")).toBe("true");
  });

  it("repliée : le contenu n'est pas rendu, aria-expanded faux", () => {
    render(<SectionRetractable {...base} repliee><p>contenu</p></SectionRetractable>);
    expect(screen.queryByText("contenu")).toBeNull();
    expect(screen.getByRole("button").getAttribute("aria-expanded")).toBe("false");
  });

  it("taper l'en-tête appelle onBasculer", () => {
    const onBasculer = vi.fn();
    render(<SectionRetractable {...base} onBasculer={onBasculer} repliee={false}><p>c</p></SectionRetractable>);
    screen.getByRole("button").click();
    expect(onBasculer).toHaveBeenCalledTimes(1);
  });

  it("repliée avec des quêtes prêtes : le compteur les annonce", () => {
    render(
      <SectionRetractable {...base} repliee compteur={{ total: 3, faits: 2, pretes: 1 }}>
        <p>c</p>
      </SectionRetractable>,
    );
    const entete = screen.getByRole("button").textContent ?? "";
    expect(entete).toContain("2");
    expect(entete).toContain("3");
    expect(entete).toContain("1");
  });

  it("repliée sans quête prête : aucune mention « prête »", () => {
    render(
      <SectionRetractable {...base} repliee compteur={{ total: 3, faits: 0, pretes: 0 }}>
        <p>c</p>
      </SectionRetractable>,
    );
    expect(screen.getByRole("button").textContent ?? "").not.toMatch(/prête|ready|lista|έτοιμη/i);
  });

  it("dépliée : pas de compteur, l'information est déjà visible", () => {
    render(
      <SectionRetractable {...base} repliee={false} compteur={{ total: 3, faits: 2, pretes: 1 }}>
        <p>c</p>
      </SectionRetractable>,
    );
    expect(screen.getByRole("button").textContent ?? "").not.toContain("2/3");
  });

  it("l'en-tête est collante", () => {
    render(<SectionRetractable {...base} repliee={false}><p>c</p></SectionRetractable>);
    const entete = screen.getByRole("button");
    expect(getComputedStyle(entete).position).toBe("sticky");
  });
});
