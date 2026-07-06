import type { Objet } from "@/types/game";

/** Marge par défaut sur le prix d'achat quand la valeur de marché n'est pas connue (Connaisseur 2 absent). */
export const SUGGESTION_MARGE_ACHAT = 1.5;

const dizaine = (n: number) => Math.max(1, Math.round(n / 10) * 10);

export function prixSuggere(
  objet: Pick<Objet, "prixReferenceReel" | "prixAchat" | "prixVenteSouhaite">,
  marcheConnu: boolean,
  facteurRef: number,
): number {
  if (objet.prixVenteSouhaite != null) return objet.prixVenteSouhaite;
  if (marcheConnu) return Math.max(1, Math.round(objet.prixReferenceReel * facteurRef));
  if (objet.prixAchat != null) return dizaine(objet.prixAchat * SUGGESTION_MARGE_ACHAT);
  return dizaine(objet.prixReferenceReel); // la dizaine floute la valeur exacte
}
