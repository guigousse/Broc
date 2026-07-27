/**
 * Étage image : composition de l'étal via Gemini.
 * Le client `ai` est toujours injecté pour rester testable hors réseau.
 */

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
