// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LigneQuete } from "./LigneQuete";
import { createMockGameState, createMockObjet } from "@/lib/__test-fixtures__/gameState";
import type { Courrier, ObjectifMission } from "@/types/game";

afterEach(cleanup);

function courrierObjet(): Courrier {
  return {
    id: "q1", type: "mission", jourRecu: 1, lu: true,
    payload: {
      type: "mission", categorie: "quotidienne", expediteurId: "mode",
      titre: "Pièce vintage", corps: ["Bonjour,", "Je cherche une lampe."],
      cibles: [{ templateId: "ma.lampe_petrole_ancienne" }],
      recompense: { argent: 60 },
    },
  };
}

function courrierChiffre(objectif: ObjectifMission): Courrier {
  return {
    id: "q2", type: "mission", jourRecu: 1, lu: true,
    payload: {
      type: "mission", categorie: "hebdomadaire", expediteurId: "mode",
      titre: "Le nerf de la guerre", corps: ["Salut,", "Un pari."],
      cibles: [], objectifs: [objectif], recompense: { argent: 210 },
    },
  };
}

const props = { ouvert: false, onToggle: () => {}, onLivrer: () => {} };

describe("LigneQuete", () => {
  it("porte data-commande-id (ancre de la cérémonie)", () => {
    const c = courrierObjet();
    render(<LigneQuete {...props} courrier={c} state={createMockGameState({ courriers: [c] })} />);
    expect(document.querySelector('[data-commande-id="q1"]')).toBeTruthy();
  });

  it("le jeton argent est bien un DESCENDANT de data-commande-id (pas juste un frère ailleurs sur la page)", () => {
    // La cérémonie retrouve ses jetons via `racine.querySelectorAll('[data-jeton=...]')`
    // où `racine = document.querySelector('[data-commande-id=...]')` — la
    // livraison réelle des jetons dépend de cette IMBRICATION, pas seulement
    // de la présence indépendante des deux attributs quelque part dans le DOM.
    const c = courrierObjet();
    render(<LigneQuete {...props} courrier={c} state={createMockGameState({ courriers: [c] })} />);
    expect(document.querySelector('[data-commande-id="q1"] [data-jeton="argent"]')).toBeTruthy();
  });

  it("quête à objets : des photos, pas d'icône", () => {
    const c = courrierObjet();
    render(<LigneQuete {...props} courrier={c} state={createMockGameState({ courriers: [c] })} />);
    expect(document.querySelector("[data-photo-scotchee='objet']")).toBeTruthy();
    expect(document.querySelector("[data-photo-scotchee='icone']")).toBeNull();
  });

  it("quête chiffrée : une icône, pas de photo", () => {
    const c = courrierChiffre({ type: "beneficeCumule", montant: 850 });
    render(<LigneQuete {...props} courrier={c} state={createMockGameState({ courriers: [c] })} />);
    expect(document.querySelector("[data-photo-scotchee='icone']")).toBeTruthy();
    expect(document.querySelector("[data-photo-scotchee='objet']")).toBeNull();
  });

  it("un objectif qui compte des objets n'a pas de suffixe €", () => {
    const c = courrierChiffre({ type: "ventesCategorie", categorie: "Mode", nombre: 5 });
    render(<LigneQuete {...props} courrier={c} state={createMockGameState({ courriers: [c], missions: [{ courrierId: "q2", statut: "active" }] })} />);
    const compteur = screen.getByTestId("progression-compteur").textContent ?? "";
    expect(compteur).toContain("5");
    expect(compteur).not.toContain("€");
  });

  it("un objectif en argent garde son suffixe €", () => {
    const c = courrierChiffre({ type: "beneficeCumule", montant: 850 });
    render(<LigneQuete {...props} courrier={c} state={createMockGameState({ courriers: [c], missions: [{ courrierId: "q2", statut: "active" }] })} />);
    expect(screen.getByTestId("progression-compteur").textContent ?? "").toContain("€");
  });

  it("taper la ligne déplie, taper le pavé livre — deux cibles distinctes", () => {
    const onToggle = vi.fn();
    const onLivrer = vi.fn();
    const c = courrierObjet();
    const state = createMockGameState({
      courriers: [c],
      missions: [{ courrierId: "q1", statut: "active" }],
      inventaireJoueur: [createMockObjet({ templateId: "ma.lampe_petrole_ancienne", categorie: "Maison" })],
    });
    render(<LigneQuete {...props} courrier={c} state={state} onToggle={onToggle} onLivrer={onLivrer} />);
    screen.getByRole("button", { name: /Livrer/i }).click();
    expect(onLivrer).toHaveBeenCalledTimes(1);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("dépliée : la lettre entière apparaît", () => {
    const c = courrierObjet();
    render(<LigneQuete {...props} ouvert courrier={c} state={createMockGameState({ courriers: [c] })} />);
    expect(screen.getByText(/Je cherche une lampe/)).toBeTruthy();
  });

  it("aucune accolade non remplacée", () => {
    const c = courrierChiffre({ type: "ventesCategorie", categorie: "Musique", nombre: 4 });
    const { container } = render(<LigneQuete {...props} ouvert courrier={c} state={createMockGameState({ courriers: [c] })} />);
    expect(container.textContent ?? "").not.toMatch(/\{[a-z]+\}/);
  });

  it("collapsée : bénéfice et chiffre d'affaires (même icône TrendingUp) affichent des libellés différents", () => {
    // ICONE_FORME donne la MÊME icône à beneficeCumule et chiffreAffaires
    // (ventesCumulees) : sans le libellé de la demande dans la ligne repliée,
    // ces deux quêtes sont indiscernables au premier coup d'œil.
    const cBenefice = courrierChiffre({ type: "beneficeCumule", montant: 850 });
    const premier = render(
      <LigneQuete {...props} courrier={cBenefice} state={createMockGameState({ courriers: [cBenefice] })} />,
    );
    const texteBenefice = screen.getByTestId("ligne-demande").textContent ?? "";
    premier.unmount();

    const cVentes = courrierChiffre({ type: "ventesCumulees", montant: 300 });
    render(<LigneQuete {...props} courrier={cVentes} state={createMockGameState({ courriers: [cVentes] })} />);
    const texteVentes = screen.getByTestId("ligne-demande").textContent ?? "";

    expect(texteBenefice).not.toBe("");
    expect(texteVentes).not.toBe("");
    expect(texteBenefice).not.toBe(texteVentes);
  });

  it("en cérémonie, quête CHIFFRÉE : la barre est pleine malgré un state déjà post-livraison", () => {
    // C'est exactement le state dans lequel la cérémonie tourne réellement :
    // mission déjà marquée "livree", objet déjà retiré de l'inventaire. Sans
    // le garde-fou `accompli = enCeremonie`, la barre et le compteur
    // retomberaient à zéro pile au moment où les jetons s'envolent.
    //
    // Observé sur une quête chiffrée : depuis le retour device, la barre et le
    // compteur ne s'affichent plus pour les quêtes À CIBLES (les vignettes les
    // remplacent). Le garde-fou lui-même n'a pas changé — c'est son point
    // d'observation qui a déménagé, et le test suivant couvre l'autre moitié.
    const c = courrierChiffre({ type: "beneficeCumule", montant: 850 });
    const state = createMockGameState({
      courriers: [c],
      missions: [{ courrierId: "q2", statut: "livree", jourResolution: 1 }],
      inventaireJoueur: [],
    });
    render(<LigneQuete {...props} courrier={c} state={state} enCeremonie />);
    const barre = document.querySelector('[data-testid="progression-barre"]') as HTMLElement;
    expect(barre.style.width).toBe("100%");
    expect(screen.getByTestId("progression-compteur").textContent).toContain("850");
  });

  it("en cérémonie, quête À CIBLES : les vignettes restent « trouvées » malgré l'objet déjà consommé", () => {
    // L'autre moitié du même garde-fou : pour une quête à cibles, c'est la
    // COULEUR et la pastille ✓ des vignettes qui portent l'état accompli. Sans
    // `accompli = enCeremonie`, l'objet — déjà retiré de l'inventaire par la
    // livraison — repasserait en noir et blanc à l'instant du payoff.
    const c = courrierObjet();
    const state = createMockGameState({
      courriers: [c],
      missions: [{ courrierId: "q1", statut: "livree", jourResolution: 1 }],
      inventaireJoueur: [],
    });
    const { container } = render(<LigneQuete {...props} courrier={c} state={state} enCeremonie />);
    const grise = Array.from(container.querySelectorAll<HTMLElement>("*")).some((n) =>
      n.style.filter.includes("grayscale"),
    );
    expect(grise).toBe(false);
  });

  it("le titre est sur SA propre ligne, pas coincé dans la rangée des photos", () => {
    // Retour device 2026-08-18 : avec trois objets, la colonne du milieu était
    // écrasée entre les photos et le pavé récompense — le titre débordait et
    // passait sous la récompense, illisible. La garde structurelle est que le
    // titre soit un ENFANT DIRECT de la zone tapable, frère de la rangée
    // [photos + progression], et non un descendant de cette rangée.
    const c = courrierObjet();
    render(<LigneQuete {...props} courrier={c} state={createMockGameState({ courriers: [c] })} />);
    const zone = screen.getByRole("button", { expanded: false });
    const titre = screen.getByText("Pièce vintage");
    expect(titre.parentElement).toBe(zone);
    // La zone tapable empile ses deux lignes : sans cela, le titre repartirait
    // en concurrence de largeur avec les photos.
    expect((zone as HTMLElement).style.flexDirection).toBe("column");
    // Et la rangée du dessous, elle, contient bien les photos.
    const rangee = Array.from(zone.children).find((n) => n !== titre) as HTMLElement;
    expect(rangee.querySelector("[data-photo-scotchee]")).toBeTruthy();
  });

  it("quête à objets : ni commanditaire ni compteur — les photos et leurs ✓ le disent", () => {
    // Retour device : « Arianne 0/2 » faisait doublon avec les vignettes, et
    // c'est cette colonne du milieu qui écrasait la mise en page des quêtes à
    // trois objets. Les photos portent déjà l'identité ET l'avancement.
    const c = courrierObjet();
    render(<LigneQuete {...props} courrier={c} state={createMockGameState({ courriers: [c] })} />);
    expect(screen.queryByTestId("ligne-demande")).toBeNull();
    expect(screen.queryByTestId("progression-compteur")).toBeNull();
    expect(screen.queryByTestId("progression-barre")).toBeNull();
  });

  it("quête chiffrée : le libellé d'objectif ET le compteur restent (garde-fou T7)", () => {
    // Sans cible objet, il n'y a AUCUNE photo pour dire de quoi il s'agit :
    // « Bénéfice réalisé » et « 0 / 850 € » sont la seule identité de la quête.
    // Les retirer ici rendrait deux formes chiffrées indiscernables — c'est
    // précisément le défaut corrigé en T7, à ne pas réintroduire.
    const c = courrierChiffre({ type: "beneficeCumule", montant: 850 });
    render(<LigneQuete {...props} courrier={c} state={createMockGameState({ courriers: [c] })} />);
    expect(screen.getByTestId("ligne-demande").textContent).toBeTruthy();
    expect(screen.getByTestId("progression-compteur").textContent).toContain("850");
  });
});
