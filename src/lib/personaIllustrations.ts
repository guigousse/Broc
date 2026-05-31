import type { VendeurArchetypeId } from "@/types/game";

const VENDEUR_ILLUSTRATION_MAP: Record<VendeurArchetypeId, string> = {
  naif: "/personas/vendeur-naif.png",
  bonhomme: "/personas/vendeur-bonhomme.png",
  mamie: "/personas/vendeur-mamie.png",
  malin: "/personas/vendeur-malin.png",
  grincheux: "/personas/vendeur-grincheux.png",
  antiquaire: "/personas/vendeur-antiquaire.png",
};

/** Retourne le chemin de l'illustration d'un vendeur, ou undefined si l'archétype est inconnu. */
export function getVendeurIllustration(archetype: string): string | undefined {
  return VENDEUR_ILLUSTRATION_MAP[archetype as VendeurArchetypeId];
}
