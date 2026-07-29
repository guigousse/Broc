/** Rendu du gabarit HTML en PNG aplati, aux dimensions finales. */
import sharp from "sharp";

/** Fond du gabarit : sert de couleur d'aplatissement de l'alpha. */
const FOND = "#1e1208";

export async function rendreVisuel({ navigateur, html, sortie, fichier }) {
  const contexte = await navigateur.newContext({
    viewport: sortie,
    deviceScaleFactor: 1,
  });
  const page = await contexte.newPage();
  try {
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const brut = await page.screenshot({ type: "png" });
    // Playwright produit toujours un PNG avec alpha ; Apple le refuse.
    await sharp(brut)
      .flatten({ background: FOND })
      .removeAlpha()
      .png({ compressionLevel: 9 })
      .toFile(fichier);
  } finally {
    await contexte.close();
  }
}
