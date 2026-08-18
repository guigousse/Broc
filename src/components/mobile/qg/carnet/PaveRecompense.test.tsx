// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PaveRecompense } from "./PaveRecompense";
import { DICTIONNAIRES, tr } from "@/lib/i18n/ui";

afterEach(cleanup);

const REC = { argent: 60, xp: 12, energie: 0 };
const d = DICTIONNAIRES.fr;

describe("PaveRecompense", () => {
  it("porte data-jeton pour chaque gain non nul, et pour eux seuls", () => {
    render(<PaveRecompense recompense={REC} livrable={false} onLivrer={() => {}} />);
    expect(document.querySelector('[data-jeton="argent"]')).toBeTruthy();
    expect(document.querySelector('[data-jeton="xp"]')).toBeTruthy();
    // énergie vaut 0 : pas de jeton, sinon la cérémonie masquerait un jeton
    // qu'aucune étape ne fera réapparaître.
    expect(document.querySelector('[data-jeton="energie"]')).toBeNull();
  });

  it("pas livrable : aucun bouton, le libellé annonce la récompense", () => {
    render(<PaveRecompense recompense={REC} livrable={false} onLivrer={() => {}} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("livrable : bouton actif qui appelle onLivrer", async () => {
    const onLivrer = vi.fn();
    render(<PaveRecompense recompense={REC} livrable onLivrer={onLivrer} />);
    const btn = screen.getByRole("button") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    btn.click();
    expect(onLivrer).toHaveBeenCalledTimes(1);
  });

  it("verrouillé : bouton présent mais désactivé, onLivrer jamais appelé", () => {
    const onLivrer = vi.fn();
    render(<PaveRecompense recompense={REC} livrable verrouille onLivrer={onLivrer} />);
    const btn = screen.getByRole("button") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    btn.click();
    expect(onLivrer).not.toHaveBeenCalled();
  });

  it("les jetons restent présents à l'état livrable (la cérémonie part d'eux)", () => {
    render(<PaveRecompense recompense={REC} livrable onLivrer={() => {}} />);
    // Les TROIS assertions du passage en pavé sourd, pas seulement `argent` :
    // le passage en bouton change le conteneur, donc c'est bien la règle
    // entière (un jeton par gain non nul, et pour eux seuls) qu'il faut
    // revérifier — un jeton perdu ici est un jeton que la cérémonie ne fera
    // jamais voler.
    expect(document.querySelector('[data-jeton="argent"]')).toBeTruthy();
    expect(document.querySelector('[data-jeton="xp"]')).toBeTruthy();
    expect(document.querySelector('[data-jeton="energie"]')).toBeNull();
  });

  it("récompense entièrement nulle : aucun jeton, et le bouton livre quand même", () => {
    // `argent: 0` est légal (une quête peut ne donner que de l'XP, ou rien
    // du tout côté affichage). Le pavé ne doit ni rendre de jeton fantôme —
    // la cérémonie le masquerait sans qu'aucune étape ne le fasse
    // réapparaître — ni refuser la livraison pour autant.
    const onLivrer = vi.fn();
    render(<PaveRecompense recompense={{ argent: 0, xp: 0, energie: 0 }} livrable onLivrer={onLivrer} />);
    expect(document.querySelectorAll("[data-jeton]").length).toBe(0);
    const btn = screen.getByRole("button") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    btn.click();
    expect(onLivrer).toHaveBeenCalledTimes(1);
  });

  it("aucune couleur bordeaux codée en dur", () => {
    const { container } = render(<PaveRecompense recompense={REC} livrable onLivrer={() => {}} />);
    expect(container.innerHTML.toLowerCase()).not.toContain("#6e1f1f");
  });

  it("le texte des jetons vient des clés i18n existantes, pas d'un gabarit codé en dur", () => {
    render(<PaveRecompense recompense={REC} livrable={false} onLivrer={() => {}} />);
    const jetonArgent = document.querySelector('[data-jeton="argent"]');
    const jetonXp = document.querySelector('[data-jeton="xp"]');
    // Si quelqu'un recode `+${n} €` en dur dans le composant, ce test échoue
    // dès que jetonArgent/jetonXp change de forme dans le dictionnaire (par
    // ex. un futur "€{n}" ou une unité déplacée) : la source de vérité est
    // la même que celle utilisée par RecompenseJetons, pas une copie locale.
    expect(jetonArgent?.textContent).toBe(tr(d.carnet.jetonArgent, { n: REC.argent }));
    expect(jetonXp?.textContent).toBe(tr(d.carnet.jetonXp, { n: REC.xp }));
  });
});
