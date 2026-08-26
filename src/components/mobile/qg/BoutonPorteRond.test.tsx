// @vitest-environment jsdom
/**
 * Le médaillon des portes : un rond de laiton, une illustration dedans, et le
 * mot posé sur la courbe basse.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BoutonPorteRond } from "./BoutonPorteRond";

afterEach(cleanup);

function poser(surcharges: Partial<Parameters<typeof BoutonPorteRond>[0]> = {}) {
  const onClick = vi.fn();
  const { container } = render(
    <BoutonPorteRond libelle="Chiner" image="/ui/portes/chiner.webp" onClick={onClick} {...surcharges} />,
  );
  return { onClick, container, bouton: screen.getByRole("button", { name: "Chiner" }) };
}

describe("BoutonPorteRond", () => {
  it("porte son illustration et son mot", () => {
    const { container, bouton } = poser();
    expect(container.querySelector("img")!.getAttribute("src")).toBe("/ui/portes/chiner.webp");
    // Capitales à l'œil, casse d'origine pour le nom accessible.
    expect(container.querySelector("textPath")!.textContent).toBe("CHINER");
    expect(bouton.getAttribute("aria-label")).toBe("Chiner");
  });

  /**
   * Le mot suit la courbe INTÉRIEURE BASSE. Un `textPath` est la seule façon
   * d'y arriver sans découper le mot lettre à lettre — et le chemin qu'il
   * suit est aussi celui du ruban sombre posé dessous, pour que les deux ne
   * puissent pas se désaligner.
   */
  it("pose le mot sur un arc, et le ruban sur le même arc", () => {
    const { container } = poser();
    const chemin = container.querySelector("textPath")!.getAttribute("href")!;
    // Utilisable tel quel comme sélecteur : pas de deux-points hérités de `useId`.
    expect(chemin).toMatch(/^#[\w-]+$/);
    const arc = container.querySelector(chemin!) as SVGPathElement;
    expect(arc).not.toBeNull();
    // Le ruban est le MÊME `d`, tracé en épais : un seul chemin, deux emplois.
    const ruban = container.querySelector("[data-ruban]") as SVGPathElement;
    expect(ruban.getAttribute("d")).toBe(arc.getAttribute("d"));
  });

  /**
   * `FloatingActionBar` coupe les événements de pointeur sur toute sa colonne
   * (`pointer-events: none`) pour ne pas voler les taps du panorama derrière.
   * Seuls ses boutons les rétablissent. Sans ça, le médaillon serait un
   * dessin que le doigt traverse.
   */
  it("rétablit les événements de pointeur que la barre coupe", () => {
    const { bouton } = poser();
    expect(bouton.style.pointerEvents).toBe("auto");
  });

  /**
   * LA MAIN POINTEUSE DU TUTORIEL est un `::after` posé AU-DESSUS de sa cible
   * (`bottom: calc(100% + 26px)`), donc entièrement hors de sa boîte. Le
   * médaillon, lui, rogne (`overflow: hidden`) pour découper son illustration
   * en cercle. Poser la classe sur le bouton faisait donc disparaître la main.
   *
   * Elle va sur une ENVELOPPE qui ne rogne pas — et c'est le composant qui la
   * pose, pas ses appelants : lui seul sait qu'il rogne.
   */
  it("pose la classe du tutoriel hors du cercle qui rogne", () => {
    const { container, bouton } = poser({ className: "tuto-pulse tuto-main tuto-main-haut" });
    const enveloppe = container.querySelector(".tuto-main") as HTMLElement;
    expect(enveloppe).not.toBe(bouton);
    expect(enveloppe.contains(bouton)).toBe(true);
    expect(enveloppe.style.overflow).not.toBe("hidden");
    expect(bouton.style.overflow).toBe("hidden");
  });

  /**
   * `.tuto-pulse` impose un `border-radius: 12px`, et le halo qu'il anime est
   * un `box-shadow`, qui épouse ce rayon. Sur un médaillon rond, il dessinait
   * un carré arrondi. L'enveloppe le remet à 50 %.
   */
  it("rend le halo du tutoriel rond, et non carré", () => {
    const { container } = poser({ className: "tuto-pulse" });
    const enveloppe = container.querySelector(".tuto-pulse") as HTMLElement;
    expect(enveloppe.style.borderRadius).toBe("50%");
  });

  it("désactivé, le tap ne mène nulle part", async () => {
    const { onClick, bouton } = poser({ disabled: true });
    await userEvent.click(bouton);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("actif, le tap passe", async () => {
    const { onClick, bouton } = poser();
    await userEvent.click(bouton);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  /**
   * Cadenassé, le médaillon s'éteint et porte un cadenas. Le mot RESTE sur
   * l'arc : le lieu garde son nom, et le compte à rebours se pose à côté du
   * cadenas plutôt que de prendre sa place — sinon le bouton ne dirait plus
   * de quoi il parle, ni à l'œil ni au lecteur d'écran.
   */
  it("cadenassé : éteint, un cadenas, un compte à rebours, et le nom reste", () => {
    const { container, bouton } = poser({ cadenasse: true, compteARebours: "J-15", disabled: true });
    expect(container.querySelector("[data-cadenas]")).not.toBeNull();
    expect(screen.getByText("J-15")).not.toBeNull();
    // Le lieu garde son nom : le compte à rebours s'ajoute, il ne remplace pas.
    expect(bouton.getAttribute("aria-label")).toBe("Chiner");
    expect(container.querySelector("textPath")!.textContent).toBe("CHINER");
    expect(container.querySelector("img")!.style.filter).toContain("grayscale");
  });

  it("sans cadenas, l'illustration garde ses couleurs", () => {
    const { container } = poser();
    expect(container.querySelector("img")!.style.filter).toBe("");
    expect(container.querySelector("[data-cadenas]")).toBeNull();
  });
});
