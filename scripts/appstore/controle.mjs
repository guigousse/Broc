/** Contrôle des PNG livrés à App Store Connect. */
import sharp from "sharp";

/**
 * Vérifie les trois exigences d'Apple : dimensions natives exactes, aucun
 * canal alpha (la transparence est refusée), espace colorimétrique sRGB.
 */
export async function controlerFichier(chemin, attendu) {
  const problemes = [];
  let meta;
  try {
    meta = await sharp(chemin).metadata();
  } catch {
    return { fichier: chemin, ok: false, problemes: ["fichier introuvable ou illisible"] };
  }
  if (meta.width !== attendu.width || meta.height !== attendu.height) {
    problemes.push(
      `dimensions ${meta.width}×${meta.height}, attendu ${attendu.width}×${attendu.height}`,
    );
  }
  if (meta.hasAlpha) problemes.push("canal alpha présent (transparence refusée par Apple)");
  // Un espace absent/illisible n'est pas une preuve de sRGB : c'est le
  // dernier filet avant App Store Connect, un `meta.space` manquant doit
  // être signalé comme les autres, pas laissé passer silencieusement.
  if (meta.space !== "srgb") problemes.push(`espace ${meta.space ?? "inconnu"}, attendu srgb`);
  return { fichier: chemin, ok: problemes.length === 0, problemes };
}

export function resumerControles(resultats) {
  const bons = resultats.filter((r) => r.ok).length;
  const lignes = [`Contrôle : ${bons} / ${resultats.length} fichiers conformes.`];
  for (const r of resultats.filter((x) => !x.ok)) {
    lignes.push(`  ✗ ${r.fichier} — ${r.problemes.join(" ; ")}`);
  }
  return lignes.join("\n");
}
