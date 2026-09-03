/* Capture de recette : l'album de timbres après la refonte du 2026-09-02.
 * Lancer DEPUIS scripts/ (le scratchpad ne résout pas playwright) :
 *   node capture-album-timbres.mjs <dossier-sortie>
 */
import { chromium } from "playwright";

const OUT = process.argv[2] || ".";
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 664 },
  hasTouch: true,
  locale: "fr-FR",
});

// 1. Installer la save de test (slot 3, actif) puis ouvrir le jeu.
await page.goto("http://localhost:3100/dev-save-albums.html");
await page.click("#go");
await page.waitForTimeout(300);
// La save de banc laisse l'album de timbres non acheté : on le patche avec
// des timbres possédés (dont un doublon), 3 posés sur la page 0.
await page.evaluate(() => {
  const cle = "projet-broc:slot:3:v1";
  const save = JSON.parse(localStorage.getItem(cle));
  save.albums.timbres = {
    achete: true,
    pieces: {
      "timbre.renard_roux": 2,
      "timbre.herisson_d_europe": 1,
      "timbre.mesange_bleue": 1,
      "timbre.cerf_en_brame": 1,
      "timbre.lynx_boreal": 1,
      "timbre.paquebot_etoile_du_nord": 1,
      "timbre.ballon_monte_1870": 1,
      "timbre.phare_de_ker_avel": 1,
    },
    nouvelles: ["timbre.lynx_boreal"],
    placements: {
      "timbre.paquebot_etoile_du_nord": { page: 0, ligne: 0, x: 0.2 },
      "timbre.ballon_monte_1870": { page: 0, ligne: 0, x: 0.5 },
      "timbre.phare_de_ker_avel": { page: 0, ligne: 2, x: 0.35 },
    },
    ordreZ: [
      "timbre.paquebot_etoile_du_nord",
      "timbre.ballon_monte_1870",
      "timbre.phare_de_ker_avel",
    ],
  };
  localStorage.setItem(cle, JSON.stringify(save));
});
await page.goto("http://localhost:3100/");
await page.waitForTimeout(4000);

// 2. « Continuer » charge l'emplacement actif (3).
await page.getByText("Continuer").first().click();
await page.waitForTimeout(4000);

// 3. Collection → onglet Livres & Papeterie → tuile Album de timbres.
await page.goto("http://localhost:3100/collection");
await page.waitForTimeout(2500);
await page.getByRole("tab").nth(3).click();
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/02-collection.png` });
await page.getByRole("button", { name: /Album de timbres/ }).first().click();
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/03-album-timbres.png` });
await page.getByRole("button", { name: /Fermer/ }).click();
await page.waitForTimeout(600);

// 4. Onglet Jeux & Loisirs → tuile Classeur de cartes.
await page.getByRole("tab").nth(2).click();
await page.waitForTimeout(800);
await page.getByRole("button", { name: /Classeur de cartes/ }).first().click();
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/04-classeur.png` });

await browser.close();
console.log("captures dans", OUT);
