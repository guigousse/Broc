import type { VendeurArchetypeId } from "@/types/game";
import { EXPEDITEURS } from "@/data/expediteursCourrier";

/** Au-dessus de ce seuil d'humeur (0–1), le vendeur est représenté fâché. */
export const HUMEUR_FACHE_SEUIL = 0.75;

/** Repli si un avatar de commanditaire venait à manquer (champ optionnel). */
const ILLUSTRATION_PLACEHOLDER = "/personas/vendeur-mystere.webp";

const VENDEUR_ILLUSTRATION_MAP: Record<VendeurArchetypeId, string> = {
  naif: "/personas/vendeur-naif.webp",
  bonhomme: "/personas/vendeur-bonhomme.webp",
  mamie: "/personas/vendeur-mamie.webp",
  malin: "/personas/vendeur-malin.webp",
  grincheux: "/personas/vendeur-grincheux.webp",
  antiquaire: "/personas/vendeur-antiquaire.webp",
  pipelette: "/personas/vendeur-pipelette.webp",
  videcave: "/personas/vendeur-videcave.webp",
  bonimenteur: "/personas/vendeur-bonimenteur.webp",
  disquaire: "/personas/vendeur-disquaire.webp",
  // Commanditaires de quêtes — avatar du courrier (source unique).
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
  pipelette: "/personas/vendeur-pipelette-fache.webp",
  videcave: "/personas/vendeur-videcave-fache.webp",
  bonimenteur: "/personas/vendeur-bonimenteur-fache.webp",
  disquaire: "/personas/vendeur-disquaire-fache.webp",
  // Commanditaires de quêtes — variantes fâchées propres au chinage.
  joueur: "/personas/commanditaires/jeux-video-fache.webp",
  setdesigner: "/personas/commanditaires/set-designer-fache.webp",
  modeuse: "/personas/commanditaires/mode-fache.webp",
  esthete: "/personas/commanditaires/art-fache.webp",
};

/** Retourne le chemin de l'illustration d'un vendeur, ou undefined si l'archétype est inconnu. */
export function getVendeurIllustration(archetype: string): string | undefined {
  return VENDEUR_ILLUSTRATION_MAP[archetype as VendeurArchetypeId];
}

/** Retourne le chemin de l'illustration fâchée d'un vendeur, ou undefined si l'archétype est inconnu. */
export function getVendeurIllustrationFache(archetype: string): string | undefined {
  return VENDEUR_ILLUSTRATION_FACHE_MAP[archetype as VendeurArchetypeId];
}

/* ------------------------------------------------------------------ */
/* Acheteurs (archétypes clients de la vente)                          */
/* ------------------------------------------------------------------ */

/** Archétypes clients illustrés — clés = `ClientArchetype.id` (clients.ts).
 *  Assets générés par `npm run gen:clients` dans public/personas/clients/. */
const CLIENT_ARCHETYPES_ILLUSTRES = [
  "retraite_chineur",
  "passionnee_artdeco",
  "brocanteur_concurrent",
  "collectionneur_musique",
  "gamer_nostalgique",
  "bibliophile",
  "bricoleur_dimanche",
  "etudiant_fauche",
  "snob_bourgeois",
  "touriste_perdu",
  "famille_dimanche",
  "decorateur",
  "amateur_vintage",
  "notable_curieux",
  "opportuniste",
  "galeriste",
] as const;

const CLIENTS_ILLUSTRES = new Set<string>(CLIENT_ARCHETYPES_ILLUSTRES);

/** Silhouette noire : client dont le persona n'est pas encore révélé
 *  (compétence Lecteur d'âmes non débloquée). */
export const CLIENT_SILHOUETTE = "/personas/clients/client-inconnu.webp";

/** Illustration d'un acheteur, ou undefined (célébrité, archétype inconnu →
 *  silhouette). */
export function getClientIllustration(archetypeId: string): string | undefined {
  return CLIENTS_ILLUSTRES.has(archetypeId)
    ? `/personas/clients/client-${archetypeId}.webp`
    : undefined;
}

/** Variante fâchée d'un acheteur — générée en image-to-image depuis le
 *  portrait calme (`gen:clients --fache`) pour garder le même personnage. */
export function getClientIllustrationFache(archetypeId: string): string | undefined {
  return CLIENTS_ILLUSTRES.has(archetypeId)
    ? `/personas/clients/client-${archetypeId}-fache.webp`
    : undefined;
}
