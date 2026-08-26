// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PaveRecompense } from "./PaveRecompense";
import { DICTIONNAIRES, tr } from "@/lib/i18n/ui";
import { HAUTEUR_SIGNE_DISPLAY } from "@/components/ui/BazarcoinIcon";

afterEach(cleanup);

const REC = { argent: 60, xp: 12, energie: 0, jetons: 0 };
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
    render(<PaveRecompense recompense={{ argent: 0, xp: 0, energie: 0, jetons: 0 }} livrable onLivrer={onLivrer} />);
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
    // Si quelqu'un recode `${n} €` en dur dans le composant, ce test échoue
    // dès que gainArgent/gainXp change de forme dans le dictionnaire (par
    // ex. un futur "€{n}" ou une unité déplacée) : la source de vérité est
    // la même que celle utilisée par RecompenseJetons, pas une copie locale.
    expect(jetonArgent?.textContent).toBe(tr(d.carnet.gainArgent, { n: REC.argent }));
    expect(jetonXp?.textContent).toBe(tr(d.carnet.gainXp, { n: REC.xp }));
    // Et surtout : PAS le gabarit du grand livre, qui garde son « + ».
    expect(jetonArgent?.textContent).not.toContain("+");
  });

  /* ─── relief et appel au tap (retour device 2026-08-18) ─── */

  it("pas livrable : plaque creusée, AUCUN pointillé", () => {
    const { container } = render(<PaveRecompense recompense={REC} livrable={false} onLivrer={() => {}} />);
    // Le pointillé disait « découpe de papier » ; il brouillait la lecture
    // avec les liserés en pointillé du détail déplié.
    expect(container.innerHTML).not.toContain("dashed");
    // Creusée : l'ombre est INTERNE — c'est ce qui la distingue du bouton.
    const plaque = container.firstElementChild as HTMLElement;
    expect(plaque.style.boxShadow).toContain("inset");
  });

  it("livrable : bouton vert en relief, ombre PORTÉE et non interne", () => {
    render(<PaveRecompense recompense={REC} livrable onLivrer={() => {}} />);
    const btn = screen.getByRole("button");
    expect(btn.style.background).toContain("--forest-600");
    // Le relief vient de la classe (cf. globals.css) : rien en ligne, sinon
    // l'ombre statique et l'ombre animée se disputeraient la cascade.
    expect(btn.style.boxShadow).toBe("");
    expect(btn.className).toContain("broc-pave-livrer");
  });

  it("verrouillé par une autre cérémonie : ni vert ni pulsation", () => {
    render(<PaveRecompense recompense={REC} livrable verrouille onLivrer={() => {}} />);
    const btn = screen.getByRole("button");
    // Un bouton grisé qui pulse quand même appellerait un tap qui sera refusé.
    expect(btn.className).not.toContain("broc-pave-livrer");
    expect(btn.style.background).not.toContain("--forest-600");
  });

  it("bouton Livrer : contenu centré, pas aligné à gauche", () => {
    render(<PaveRecompense recompense={REC} livrable onLivrer={() => {}} />);
    const btn = screen.getByRole("button");
    expect(btn.style.alignItems).toBe("center");
  });

  it("plaque de récompense : contenu centré aussi, pour que rien ne saute au passage en bouton", () => {
    // Les deux états occupent le MÊME emplacement : un alignement différent
    // ferait tressauter les jetons à l'instant où la quête devient livrable —
    // et la cérémonie part précisément de ces jetons.
    const { container } = render(<PaveRecompense recompense={REC} livrable={false} onLivrer={() => {}} />);
    const plaque = container.firstElementChild as HTMLElement;
    expect(plaque.style.alignItems).toBe("center");
  });
  /* ─── les deux devises à la même hauteur (retour 2026-08-23) ─── */

  it("le signe Ƶ prend la hauteur du « € » voisin, et non une taille choisie à l'œil", () => {
    // Le défaut corrigé : `size={12}` en dur à côté d'un « € » qui n'en
    // mesurait que 6,4 (0,492 em de Cormorant à corps 13) — le Ƶ faisait
    // 1,9 fois le €.
    render(
      <PaveRecompense
        recompense={{ argent: 250, xp: 0, energie: 0, jetons: 3 }}
        livrable={false}
        onLivrer={() => {}}
      />,
    );
    const svg = document.querySelector('[data-jeton="bazar"] svg');
    expect(svg?.getAttribute("height")).toBe(HAUTEUR_SIGNE_DISPLAY);
  });

  it("les montants sont écrits en police d'affichage — sans quoi 0,73 em ne veut plus rien dire", () => {
    // La constante est la hauteur du « € » DE CINZEL. Reposer ces pastilles
    // sur `--font-serif` sans y toucher rendrait le Ƶ une fois et demie trop
    // haut, en silence : ce test est la sentinelle de ce couplage.
    render(<PaveRecompense recompense={REC} livrable={false} onLivrer={() => {}} />);
    const argent = document.querySelector('[data-jeton="argent"]') as HTMLElement;
    expect(argent.style.fontFamily).toBe("var(--font-display)");
    expect(argent.style.fontVariantNumeric).toContain("lining-nums");
  });
});
