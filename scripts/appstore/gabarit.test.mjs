import { describe, expect, it } from "vitest";
import { APPAREILS, VISUELS } from "./config.mjs";
import { BULLE, TITRES } from "./textes.mjs";
import { construireHtml, extraireFontFace } from "./gabarit.mjs";

const CSS = `
@font-face { font-family: 'Cinzel'; src: url(/fonts/google/g05.woff2) format('woff2');
  unicode-range: U+0000-00FF; }
@font-face { font-family: 'Cinzel'; src: url('/fonts/google/gfs-didot-greek.woff2') format('woff2');
  unicode-range: U+0370-0377; }
@font-face { font-family: 'Caveat'; src: url(/fonts/google/g03.woff2) format('woff2');
  unicode-range: U+0000-00FF; }
@font-face { font-family: 'Courier Prime'; src: url(/fonts/google/g20.woff2) format('woff2'); }
`;

const FAUX = "data:image/webp;base64,AAAA";
const base = (n, appareil = "iphone") => ({
  visuel: VISUELS[n - 1],
  langue: "fr",
  appareil: APPAREILS[appareil],
  fontFaceCss: "",
  captureDataUri: n === 5 ? null : FAUX,
  grandPereDataUri: FAUX,
  portraitsDataUri: Array.from({ length: 19 }, () => FAUX),
});

describe("extraction des @font-face du jeu", () => {
  it("garde les familles demandées et écarte les autres", () => {
    const css = extraireFontFace(CSS, ["Cinzel", "Caveat"], "file:///app/public");
    expect(css).toContain("Cinzel");
    expect(css).toContain("Caveat");
    expect(css).not.toContain("Courier Prime");
  });

  it("conserve le repli grec déclaré sous le nom Cinzel", () => {
    const css = extraireFontFace(CSS, ["Cinzel"], "file:///app/public");
    expect(css).toContain("gfs-didot-greek.woff2");
    expect(css).toContain("U+0370-0377");
  });

  it("réécrit les URL en absolu, avec ou sans guillemets", () => {
    const css = extraireFontFace(CSS, ["Cinzel"], "file:///app/public");
    expect(css).toContain("url(file:///app/public/fonts/google/g05.woff2)");
    expect(css).toContain("url('file:///app/public/fonts/google/gfs-didot-greek.woff2')");
  });

  it("lève si aucune famille ne correspond", () => {
    expect(() => extraireFontFace(CSS, ["Helvetica"], "file:///x")).toThrow(/Helvetica/);
  });
});

describe("gabarit des visuels", () => {
  it("dimensionne la page à la sortie exacte de l'appareil", () => {
    expect(construireHtml(base(1, "iphone"))).toContain("width: 1242px");
    expect(construireHtml(base(1, "iphone"))).toContain("height: 2688px");
    expect(construireHtml(base(1, "ipad"))).toContain("width: 2064px");
    expect(construireHtml(base(1, "ipad"))).toContain("height: 2752px");
  });

  it("affiche le titre de la langue demandée", () => {
    const html = construireHtml({ ...base(1), langue: "el" });
    expect(html).toContain(TITRES.chiner.el);
    expect(html).toContain('lang="el"');
  });

  it("demande Cinzel pour le titre, y compris en grec", () => {
    // Le repli grec est déclaré SOUS le nom Cinzel dans globals.css : aucun
    // cas particulier ne doit exister ici.
    const el = construireHtml({ ...base(1), langue: "el" });
    expect(el).toContain("'Cinzel'");
    expect(el).not.toMatch(/GFS Didot|EB Garamond/);
  });

  it("insère la capture et le grand-père sur les visuels 1 à 4", () => {
    for (const n of [1, 2, 3, 4]) {
      const html = construireHtml(base(n));
      expect(html).toContain('class="chassis"');
      expect(html.match(/data:image\/webp;base64,AAAA/g).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("ne met ni châssis ni capture sur le visuel 5", () => {
    const html = construireHtml(base(5));
    expect(html).not.toContain('class="chassis"');
    expect(html).toContain('class="grille"');
  });

  it("affiche la Dynamic Island sur iPhone et pas sur iPad", () => {
    expect(construireHtml(base(1, "iphone"))).toContain('class="island"');
    expect(construireHtml(base(1, "ipad"))).not.toContain('class="island"');
  });

  it("remplit 16 cases sur iPhone et 20 sur iPad, la dernière étant « et + »", () => {
    const tel = construireHtml(base(5, "iphone"));
    const tab = construireHtml(base(5, "ipad"));
    expect(tel.match(/class="case/g)).toHaveLength(16);
    expect(tab.match(/class="case/g)).toHaveLength(20);
    for (const html of [tel, tab]) {
      expect(html).toContain("et +");
      expect(html.lastIndexOf("et +")).toBeGreaterThan(html.lastIndexOf("<img class=\"portrait\""));
    }
  });

  it("n'affiche la bulle que sur le visuel 5", () => {
    expect(construireHtml(base(5))).toContain(BULLE.fr);
    for (const n of [1, 2, 3, 4]) {
      expect(construireHtml(base(n))).not.toContain(BULLE.fr);
    }
  });

  it("place le grand-père après le châssis, pour qu'il passe devant", () => {
    const html = construireHtml(base(1));
    expect(html.indexOf('class="grand-pere"')).toBeGreaterThan(html.indexOf('class="chassis"'));
  });

  it("injecte les @font-face fournis", () => {
    const html = construireHtml({ ...base(1), fontFaceCss: "/*FONTES*/" });
    expect(html).toContain("/*FONTES*/");
  });

  it("dimensionne le châssis par la largeur sur iPhone, par la hauteur sur iPad", () => {
    expect(construireHtml(base(1, "iphone"))).toMatch(/\.chassis\s*\{[^}]*width:\s*869px/);
    expect(construireHtml(base(1, "ipad"))).toMatch(/\.chassis\s*\{[^}]*height:\s*1651px/);
  });
});
