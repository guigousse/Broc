import type { VendeurArchetypeId } from "@/types/game";

/** Au-dessus de ce seuil d'humeur (0–1), le vendeur est représenté fâché. */
export const HUMEUR_FACHE_SEUIL = 0.75;

const VENDEUR_ILLUSTRATION_MAP: Record<VendeurArchetypeId, string> = {
  naif: "/personas/vendeur-naif.png",
  bonhomme: "/personas/vendeur-bonhomme.png",
  mamie: "/personas/vendeur-mamie.png",
  malin: "/personas/vendeur-malin.png",
  grincheux: "/personas/vendeur-grincheux.png",
  antiquaire: "/personas/vendeur-antiquaire.png",
};

const VENDEUR_ILLUSTRATION_FACHE_MAP: Record<VendeurArchetypeId, string> = {
  naif: "/personas/vendeur-naif-fache.png",
  bonhomme: "/personas/vendeur-bonhomme-fache.png",
  mamie: "/personas/vendeur-mamie-fache.png",
  malin: "/personas/vendeur-malin-fache.png",
  grincheux: "/personas/vendeur-grincheux-fache.png",
  antiquaire: "/personas/vendeur-antiquaire-fache.png",
};

/** Retourne le chemin de l'illustration d'un vendeur, ou undefined si l'archétype est inconnu. */
export function getVendeurIllustration(archetype: string): string | undefined {
  return VENDEUR_ILLUSTRATION_MAP[archetype as VendeurArchetypeId];
}

/** Retourne le chemin de l'illustration fâchée d'un vendeur, ou undefined si l'archétype est inconnu. */
export function getVendeurIllustrationFache(archetype: string): string | undefined {
  return VENDEUR_ILLUSTRATION_FACHE_MAP[archetype as VendeurArchetypeId];
}
