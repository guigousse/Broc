import type { VendeurArchetypeId } from "@/types/game";
import { EXPEDITEURS } from "@/data/expediteursCourrier";

/** Au-dessus de ce seuil d'humeur (0–1), le vendeur est représenté fâché. */
export const HUMEUR_FACHE_SEUIL = 0.75;

/** Placeholder tant que les illustrations des nouveaux vendeurs ne sont pas générées. */
const ILLUSTRATION_PLACEHOLDER = "/personas/vendeur-mystere.webp";

const VENDEUR_ILLUSTRATION_MAP: Record<VendeurArchetypeId, string> = {
  naif: "/personas/vendeur-naif.webp",
  bonhomme: "/personas/vendeur-bonhomme.webp",
  mamie: "/personas/vendeur-mamie.webp",
  malin: "/personas/vendeur-malin.webp",
  grincheux: "/personas/vendeur-grincheux.webp",
  antiquaire: "/personas/vendeur-antiquaire.webp",
  pipelette: ILLUSTRATION_PLACEHOLDER,
  videcave: ILLUSTRATION_PLACEHOLDER,
  bonimenteur: ILLUSTRATION_PLACEHOLDER,
  disquaire: ILLUSTRATION_PLACEHOLDER,
  // Commanditaires de quêtes — avatar du courrier (pas encore de variante fâchée).
  joueur: EXPEDITEURS["jeux-video"].avatar ?? ILLUSTRATION_PLACEHOLDER,
  setdesigner: EXPEDITEURS["set-designer"].avatar ?? ILLUSTRATION_PLACEHOLDER,
  modeuse: EXPEDITEURS.mode.avatar ?? ILLUSTRATION_PLACEHOLDER,
  esthete: EXPEDITEURS.art.avatar ?? ILLUSTRATION_PLACEHOLDER,
};

const VENDEUR_ILLUSTRATION_FACHE_MAP: Record<VendeurArchetypeId, string> = {
  naif: "/personas/vendeur-naif-fache.webp",
  bonhomme: "/personas/vendeur-bonhomme-fache.webp",
  mamie: "/personas/vendeur-mamie-fache.webp",
  malin: "/personas/vendeur-malin-fache.webp",
  grincheux: "/personas/vendeur-grincheux-fache.webp",
  antiquaire: "/personas/vendeur-antiquaire-fache.webp",
  pipelette: ILLUSTRATION_PLACEHOLDER,
  videcave: ILLUSTRATION_PLACEHOLDER,
  bonimenteur: ILLUSTRATION_PLACEHOLDER,
  disquaire: ILLUSTRATION_PLACEHOLDER,
  joueur: EXPEDITEURS["jeux-video"].avatar ?? ILLUSTRATION_PLACEHOLDER,
  setdesigner: EXPEDITEURS["set-designer"].avatar ?? ILLUSTRATION_PLACEHOLDER,
  modeuse: EXPEDITEURS.mode.avatar ?? ILLUSTRATION_PLACEHOLDER,
  esthete: EXPEDITEURS.art.avatar ?? ILLUSTRATION_PLACEHOLDER,
};

/** Retourne le chemin de l'illustration d'un vendeur, ou undefined si l'archétype est inconnu. */
export function getVendeurIllustration(archetype: string): string | undefined {
  return VENDEUR_ILLUSTRATION_MAP[archetype as VendeurArchetypeId];
}

/** Retourne le chemin de l'illustration fâchée d'un vendeur, ou undefined si l'archétype est inconnu. */
export function getVendeurIllustrationFache(archetype: string): string | undefined {
  return VENDEUR_ILLUSTRATION_FACHE_MAP[archetype as VendeurArchetypeId];
}
