// @vitest-environment jsdom
/**
 * LE TENANCIER, QUI PARLE ENFIN.
 *
 * Il était décor — `aria-hidden`, sourd aux taps — « faute d'avoir une
 * réplique », disait le commentaire de la scène. Il en a six, plus le
 * calendrier du prochain arrivage (demande de l'auteur, 2026-08-26).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TenancierBazar } from "./TenancierBazar";
import { REPLIQUES_TENANCIER_BAZAR, TENANCIER_BAZAR_PORTRAITS } from "@/data/dialogues";
import { prochainLundiLocalMs } from "@/lib/quetes/periode";

afterEach(cleanup);
beforeEach(() => vi.useRealTimers());

const H = 3_600_000;
const J = 24 * H;

/** Un instant où il reste `ms` avant le prochain lundi. */
function instantAvantLundi(ms: number): number {
  return prochainLundiLocalMs(new Date("2026-08-26T12:00:00").getTime()) - ms;
}

function monter(restant = 3 * J + 4 * H, tirage = () => 0) {
  const t = instantAvantLundi(restant);
  return render(<TenancierBazar horloge={() => t} tirage={tirage} />);
}

/** Fait défiler la bulle jusqu'à sa dernière ligne. */
function avancer() {
  fireEvent.click(screen.getByRole("button", { name: /continuer/i }));
}

describe("TenancierBazar", () => {
  it("est un bouton nommé, plus un décor muet", () => {
    monter();
    const tenancier = screen.getByRole("button", { name: /tenancier/i });
    expect(tenancier).toBeTruthy();
    expect(tenancier.getAttribute("aria-hidden")).toBeNull();
  });

  it("ne dit rien tant qu'on ne lui parle pas", () => {
    monter();
    expect(screen.queryByRole("button", { name: /continuer/i })).toBeNull();
  });

  /**
   * DEUX bulles : la salutation, puis le calendrier. Elles ont été réunies un
   * moment le 2026-08-26, puis séparées de nouveau — le temps de lecture entre
   * les deux fait la respiration d'un bonjour de comptoir.
   */
  it("au tap : une réplique de comptoir, puis le calendrier", () => {
    monter();
    fireEvent.click(screen.getByRole("button", { name: /tenancier/i }));
    expect(
      screen.getByText(REPLIQUES_TENANCIER_BAZAR[0].lignes[0].texte),
    ).toBeTruthy();
    avancer();
    expect(screen.getByText(/prochain arrivage/i)).toBeTruthy();
  });

  /**
   * Le délai EN GRAS, c'est la demande — et c'est la raison pour laquelle ces
   * lignes ne passent pas par le contenu scénarisé, qui ne transporte que des
   * chaînes nues.
   */
  /**
   * Le délai EN TOUTES LETTRES, en gras et souligné : c'est la seule chose de
   * la bulle que le joueur doit pouvoir attraper d'un coup d'œil.
   */
  it("le délai est écrit en toutes lettres, en gras et souligné", () => {
    monter(3 * J + 4 * H);
    fireEvent.click(screen.getByRole("button", { name: /tenancier/i }));
    avancer();
    const delai = screen.getByText("3 jours");
    expect(delai.tagName).toBe("STRONG");
    expect(delai.style.textDecoration).toContain("underline");
  });

  it("le singulier est respecté, et l'unité se resserre en approchant", () => {
    for (const [restant, attendu] of [
      [J + 2 * H, "1 jour"],
      [5 * H, "5 heures"],
      [42 * 60_000, "42 minutes"],
    ] as const) {
      cleanup();
      monter(restant);
      fireEvent.click(screen.getByRole("button", { name: /tenancier/i }));
      avancer();
      expect(screen.getByText(attendu)).toBeTruthy();
    }
  });

  it("montre le portrait du Joueur du Vide-grenier, et son nom sur le bandeau", () => {
    monter();
    fireEvent.click(screen.getByRole("button", { name: /tenancier/i }));
    const portrait = document.querySelector('img[src*="jeux-video"]');
    expect(portrait).toBeTruthy();
    expect(portrait!.getAttribute("src")).toBe(TENANCIER_BAZAR_PORTRAITS.souriant);
    expect(screen.getByText("Le Joueur du Vide-grenier")).toBeTruthy();
  });

  it("la dernière bulle referme le dialogue", () => {
    monter();
    fireEvent.click(screen.getByRole("button", { name: /tenancier/i }));
    avancer();
    avancer();
    expect(screen.queryByRole("button", { name: /continuer/i })).toBeNull();
    // …et le tenancier reste tapable pour une autre conversation.
    expect(screen.getByRole("button", { name: /tenancier/i })).toBeTruthy();
  });

  /**
   * Six répliques ne servent à rien si le tirage rend deux fois la même à la
   * suite : c'est précisément la répétition qui se remarque.
   */
  it("ne redonne jamais la même réplique deux fois de suite", () => {
    // Un tirage constamment nul redonnerait toujours la première.
    monter(3 * J, () => 0);
    const premiere = REPLIQUES_TENANCIER_BAZAR[0].lignes[0].texte;
    fireEvent.click(screen.getByRole("button", { name: /tenancier/i }));
    expect(screen.getByText(premiere)).toBeTruthy();
    avancer();
    avancer();
    fireEvent.click(screen.getByRole("button", { name: /tenancier/i }));
    expect(screen.queryByText(premiere)).toBeNull();
  });
});

/**
 * Le buste détouré ne remplit pas son rectangle : le tap doit toucher le
 * DESSIN, pas le vide du webp (demande de l'auteur, 2026-09-02). Même
 * échantillonnage alpha que le gramophone, fail-open inversé : quand l'alpha
 * est indisponible, le tap ouvre — le tenancier ne doit jamais devenir sourd.
 */
describe("TenancierBazar — l'alpha du dessin est sourd", () => {
  afterEach(() => vi.restoreAllMocks());

  /** Donne à l'img du bouton une géométrie et un canvas au pixel truqué. */
  function truquerAlpha(alpha: number) {
    const img = screen
      .getByRole("button", { name: /tenancier/i })
      .querySelector("img")!;
    Object.defineProperty(img, "complete", { value: true });
    Object.defineProperty(img, "naturalWidth", { value: 100 });
    Object.defineProperty(img, "naturalHeight", { value: 100 });
    img.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: () => {},
      getImageData: () => ({ data: [0, 0, 0, alpha] }),
    } as unknown as CanvasRenderingContext2D);
  }

  it("un tap sur un pixel transparent n'ouvre pas la conversation", () => {
    monter();
    truquerAlpha(0);
    fireEvent.click(screen.getByRole("button", { name: /tenancier/i }), {
      detail: 1,
      clientX: 50,
      clientY: 50,
    });
    expect(screen.queryByRole("button", { name: /continuer/i })).toBeNull();
  });

  it("un tap sur un pixel plein ouvre", () => {
    monter();
    truquerAlpha(255);
    fireEvent.click(screen.getByRole("button", { name: /tenancier/i }), {
      detail: 1,
      clientX: 50,
      clientY: 50,
    });
    expect(screen.getByRole("button", { name: /continuer/i })).toBeTruthy();
  });

  it("alpha indisponible : le tap ouvre quand même (fail-open)", () => {
    monter();
    // jsdom sans canvas : `getContext` rend null, l'échantillonnage échoue.
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    fireEvent.click(screen.getByRole("button", { name: /tenancier/i }), {
      detail: 1,
      clientX: 50,
      clientY: 50,
    });
    expect(screen.getByRole("button", { name: /continuer/i })).toBeTruthy();
  });

  it("un clic clavier (detail 0, sans coordonnées) ouvre toujours", () => {
    monter();
    truquerAlpha(0);
    fireEvent.click(screen.getByRole("button", { name: /tenancier/i }), {
      detail: 0,
    });
    expect(screen.getByRole("button", { name: /continuer/i })).toBeTruthy();
  });
});
