#!/usr/bin/env node
/**
 * Produit les visuels de la fiche App Store.
 *
 * Voir docs/superpowers/specs/2026-07-29-visuels-appstore-design.md
 *
 * Usage :
 *   npm run gen:appstore                          # les 40 images
 *   npm run gen:appstore -- --lang=fr --only=1    # une seule image, pour itérer
 *   npm run gen:appstore -- --skip-capture        # recompose sans relancer le jeu
 */
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

import { capturerEcrans } from "./appstore/capture.mjs";
import { parserArgs } from "./appstore/cli.mjs";
import { APPAREILS, CHEMINS, VISUELS } from "./appstore/config.mjs";
import { controlerFichier, resumerControles } from "./appstore/controle.mjs";
import { construireHtml } from "./appstore/gabarit.mjs";
import { chargerFontFaceCss } from "./appstore/polices.mjs";
import { rendreVisuel } from "./appstore/rendu.mjs";
import { demarrerServeur } from "./appstore/serveur.mjs";
import { PORTRAITS_GALERIE } from "./appstore/textes.mjs";

const FAMILLES_GABARIT = ["Cinzel", "Caveat"];

const AIDE = `
Visuels App Store — 5 visuels × 2 appareils × 4 langues.

  --lang=fr,en      langues à produire      (défaut : les 4)
  --device=iphone   appareils à produire    (défaut : iphone,ipad)
  --only=1,5        visuels à produire      (défaut : 1..5)
  --seed=N          graine du RNG du jeu    (défaut : fixe, cf. cli.mjs)
  --carte=N         rang de la carte à capturer dans le carrousel de chinage
                    (défaut : 0, la première ; sans effet hors chinage)
  --skip-capture    réutilise les captures déjà présentes
  --help            affiche ceci
`;

const log = (m) => process.stdout.write(m + "\n");

async function dataUri(chemin) {
  const buf = await fs.readFile(chemin);
  const ext = path.extname(chemin).slice(1).toLowerCase();
  const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function main() {
  const args = parserArgs(process.argv.slice(2));
  if (args.aide) { log(AIDE); return; }

  if (!fsSync.existsSync(path.join(CHEMINS.export, "index.html"))) {
    throw new Error("out/ absent — lance d'abord : npm run build");
  }

  // Sauvegarde de démo régénérée à chaque fois : elle doit rester valide
  // vis-à-vis de la version courante des migrations. APPSTORE_SEED : ce
  // script tourne dans un process Node séparé du navigateur Playwright, il
  // a donc besoin de sa propre graine (voir le commentaire en tête de
  // gen-save-demo.ts) pour que tendances/météo/célébrité du jour soient
  // reproductibles elles aussi.
  log("🧱 Génération de la sauvegarde de démo…");
  const saveJson = execFileSync("npx", ["tsx", "scripts/gen-save-demo.ts"], {
    cwd: CHEMINS.racine, encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, APPSTORE_SEED: String(args.graine) },
  });
  JSON.parse(saveJson); // valide
  await fs.writeFile(CHEMINS.saveDemo, saveJson);

  await fs.mkdir(CHEMINS.captures, { recursive: true });

  const css = await fs.readFile(CHEMINS.globalsCss, "utf8");
  const fontFaceCss = await chargerFontFaceCss(css, FAMILLES_GABARIT, CHEMINS.fonts);

  const portraitsDataUri = await Promise.all(
    PORTRAITS_GALERIE.map((p) => dataUri(path.join(CHEMINS.personas, p))),
  );

  const visuels = VISUELS.filter((v) => args.visuels.includes(v.n));
  const navigateur = await chromium.launch();
  const serveur = args.sauterCapture ? null : await demarrerServeur(CHEMINS.export);
  const resultats = [];

  try {
    for (const langue of args.langues) {
      for (const cleAppareil of args.appareils) {
        const appareil = APPAREILS[cleAppareil];

        let captures = new Map();
        if (serveur) {
          captures = await capturerEcrans({
            navigateur, baseUrl: serveur.url, langue, appareil, visuels,
            saveJson, dossier: CHEMINS.captures, graine: args.graine,
            carte: args.carte, log,
          });
        } else {
          for (const v of visuels.filter((x) => x.route)) {
            captures.set(v.cle, path.join(
              CHEMINS.captures, `${langue}-${appareil.id}-${v.cle}.png`,
            ));
          }
        }

        const dossier = path.join(CHEMINS.sorties, langue, appareil.id);
        await fs.mkdir(dossier, { recursive: true });

        for (const visuel of visuels) {
          const html = construireHtml({
            visuel, langue, appareil, fontFaceCss,
            captureDataUri: visuel.route ? await dataUri(captures.get(visuel.cle)) : null,
            grandPereDataUri: await dataUri(
              path.join(CHEMINS.portraitsHd, `${visuel.expression}.webp`),
            ),
            portraitsDataUri,
          });
          const fichier = path.join(
            dossier, `${String(visuel.n).padStart(2, "0")}-${visuel.cle}.png`,
          );
          await rendreVisuel({ navigateur, html, sortie: appareil.sortie, fichier });
          resultats.push(await controlerFichier(fichier, appareil.sortie));
          log(`  ✓ visuel ${langue}/${appareil.id}/${visuel.cle}`);
        }
      }
    }
  } finally {
    await navigateur.close();
    if (serveur) await serveur.fermer();
  }

  log("");
  log(resumerControles(resultats));
  if (resultats.some((r) => !r.ok)) process.exitCode = 1;
}

main().catch((e) => { console.error("❌", e.message); process.exitCode = 1; });
