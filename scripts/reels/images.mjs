/**
 * Étage image : composition de l'étal via Gemini.
 * Le client `ai` est toujours injecté pour rester testable hors réseau.
 */

/** Extensions acceptées pour l'image de référence, dans l'ordre de
 *  préférence. `etapeMaster` écrit toujours en PNG ; les autres formats
 *  n'existent que si quelqu'un a retouché l'image à la main (recadrage,
 *  export depuis Aperçu qui produit du JPEG…). */
export const EXTENSIONS_REFERENCE = [
  { extension: "png", mimeType: "image/png" },
  { extension: "jpeg", mimeType: "image/jpeg" },
  { extension: "jpg", mimeType: "image/jpeg" },
  { extension: "webp", mimeType: "image/webp" },
];

/**
 * Trouve, parmi les extensions connues, laquelle du fichier `base` est
 * réellement présente. `nomsPresents` est la liste des noms de fichiers du
 * dossier (pas des chemins complets — typiquement `fs.readdirSync(dossier)`).
 * Rend `{ nom, mimeType }` du premier candidat trouvé (le PNG est préféré
 * s'il coexiste avec un autre format), ou `undefined` si aucun n'existe.
 */
export function trouverImageReference(base, nomsPresents) {
  for (const { extension, mimeType } of EXTENSIONS_REFERENCE) {
    const nom = `${base}.${extension}`;
    if (nomsPresents.includes(nom)) return { nom, mimeType };
  }
  return undefined;
}

export function partsAvecImages({ texteIntro, images, prompt }) {
  return [
    {
      role: "user",
      parts: [
        { text: texteIntro },
        ...images.map((image) => ({ inlineData: image })),
        { text: prompt },
      ],
    },
  ];
}

export function extraireImage(reponse) {
  const parts = reponse.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) return Buffer.from(part.inlineData.data, "base64");
  }
  const texte = parts.find((p) => p.text)?.text ?? "";
  throw new Error(`pas d'image dans la réponse du modèle${texte ? ` — « ${texte.slice(0, 200)} »` : ""}`);
}

export async function genererImage({ ai, model, contents, aspectRatio = "9:16", imageSize = "2K" }) {
  const reponse = await ai.models.generateContent({
    model,
    contents,
    config: { imageConfig: { aspectRatio, imageSize } },
  });
  return extraireImage(reponse);
}
