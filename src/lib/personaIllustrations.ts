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
 *  Chaque archétype compte 3 personnages (`<archetypeId>.0/.1/.2`), chacun
 *  avec son propre portrait `client-<archetypeId>-<i>.webp` généré par
 *  `npm run gen:clients` dans public/personas/clients/. */
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

/** Casting croisé : ces acheteurs SONT des personnages déjà connus ailleurs
 *  (vendeurs du chinage, commanditaires du courrier) — même nom, même
 *  portrait. Clés = `ClientPersonnage.id`. */
const CLIENT_ILLUSTRATION_CROISEES: Record<
  string,
  { calme: string; fache: string }
> = {
  // Mamie Odette (vendeuse « mamie ») chine aussi chez les retraités.
  "retraite_chineur.1": {
    calme: "/personas/vendeur-mamie.webp",
    fache: "/personas/vendeur-mamie-fache.webp",
  },
  // Madame Vasseur (antiquaire) en repérage Art Déco.
  "passionnee_artdeco.2": {
    calme: "/personas/vendeur-antiquaire.webp",
    fache: "/personas/vendeur-antiquaire-fache.webp",
  },
  // Anatole la Combine (malin) rachète pour revendre.
  "brocanteur_concurrent.1": {
    calme: "/personas/vendeur-malin.webp",
    fache: "/personas/vendeur-malin-fache.webp",
  },
  // Barnabé 33-Tours (disquaire) complète son bac.
  "collectionneur_musique.2": {
    calme: "/personas/vendeur-disquaire.webp",
    fache: "/personas/vendeur-disquaire-fache.webp",
  },
  // Le Joueur du Vide-grenier (commanditaire jeux vidéo).
  "gamer_nostalgique.1": {
    calme: "/personas/commanditaires/jeux-video.webp",
    fache: "/personas/commanditaires/jeux-video-fache.webp",
  },
  // Dédé la Bretelle (bonhomme) refait son établi.
  "bricoleur_dimanche.1": {
    calme: "/personas/vendeur-bonhomme.webp",
    fache: "/personas/vendeur-bonhomme-fache.webp",
  },
  // P'tit Lucien (naïf) dépense ses économies.
  "etudiant_fauche.2": {
    calme: "/personas/vendeur-naif.webp",
    fache: "/personas/vendeur-naif-fache.webp",
  },
  // Clara (commanditaire set designer) meuble ses décors.
  "decorateur.0": {
    calme: "/personas/commanditaires/set-designer.webp",
    fache: "/personas/commanditaires/set-designer-fache.webp",
  },
  // Arianne (commanditaire mode) chasse le vintage.
  "amateur_vintage.0": {
    calme: "/personas/commanditaires/mode.webp",
    fache: "/personas/commanditaires/mode-fache.webp",
  },
  // Paul-Henry (commanditaire art) achète pour sa collection.
  "galeriste.0": {
    calme: "/personas/commanditaires/art.webp",
    fache: "/personas/commanditaires/art-fache.webp",
  },
};

/** Célébrités du carnet mondain : nom FR canonique (data/celebrites.ts,
 *  persisté tel quel en save) → slug de fichier
 *  `client-celebrite-<slug>[-fache].webp`. Générées par `gen:clients`. */
const CELEBRITE_SLUGS: Record<string, string> = {
  "un grand couturier parisien": "couturier_parisien",
  "une icône du cinéma des années 60": "icone_cinema_60s",
  "un célèbre antiquaire de la rive gauche": "antiquaire_rive_gauche",
  "une héritière mondaine": "heritiere_mondaine",
  "un collectionneur excentrique": "collectionneur_excentrique",
  "Madame de Saint-Marceaux": "mme_de_saint_marceaux",
  "Le Duc de Brissac": "duc_de_brissac",
  "Le Comte de Castiglione": "comte_de_castiglione",
  "Le Marquis d'Hautpoul": "marquis_d_hautpoul",
  "L'Ambassadeur de Belgique": "ambassadeur_belgique",
  "Le commissaire-priseur de l'Hôtel des Ventes": "commissaire_priseur",
  "L'expert du Petit Palais": "expert_petit_palais",
  "un magnat de l'industrie du luxe": "magnat_du_luxe",
  "une actrice de la Nouvelle Vague": "actrice_nouvelle_vague",
  "une diva de l'opéra à la retraite": "diva_opera",
  "un mécène discret": "mecene_discret",
  "La Baronne de Villemorin": "baronne_de_villemorin",
  "Lady Westmorland": "lady_westmorland",
  "Le Baron de R.": "baron_de_r",
};

/**
 * Portrait d'une célébrité depuis son NOM canonique (celui de
 * `data/celebrites.ts`, persisté tel quel en save) — sans passer par un
 * `ClientPersonnage`. La gazette annonce une célébrité au carnet mondain
 * bien avant qu'elle n'entre en boutique : elle n'a qu'un `CelebriteEvenement`
 * sous la main, pas un acheteur.
 *
 * `undefined` si le nom n'est pas au catalogue — l'appelant retombe alors sur
 * sa vignette de repli plutôt que de rendre une image cassée.
 */
export function getCelebriteIllustration(nom: string): string | undefined {
  const slug = CELEBRITE_SLUGS[nom];
  return slug ? `/personas/clients/client-celebrite-${slug}.webp` : undefined;
}

/** Variante fâchée, même règle (cf. `getCelebriteIllustration`). */
export function getCelebriteIllustrationFache(nom: string): string | undefined {
  const slug = CELEBRITE_SLUGS[nom];
  return slug ? `/personas/clients/client-celebrite-${slug}-fache.webp` : undefined;
}

/** Slug d'une célébrité depuis un id de personnage
 *  `celebrite.<brocanteId>.<jourSemaine>.<nom>` (le nom peut contenir des
 *  points, les ids de brocante n'en contiennent pas). */
function slugCelebrite(personnageId: string): string | undefined {
  if (!personnageId.startsWith("celebrite.")) return undefined;
  const nom = personnageId.split(".").slice(3).join(".");
  return CELEBRITE_SLUGS[nom];
}

/** Silhouette noire : client dont le persona n'est pas encore révélé
 *  (compétence Lecteur d'âmes non débloquée). */
export const CLIENT_SILHOUETTE = "/personas/clients/client-inconnu.webp";

/** `"retraite_chineur.1"` → `"retraite_chineur"`, ou null si l'id n'est pas
 *  de la forme `<archetypeIllustré>.<index>`. */
function decomposerPersonnageId(
  personnageId: string,
): { archetypeId: string; index: string } | null {
  const sep = personnageId.lastIndexOf(".");
  if (sep < 0) return null;
  const archetypeId = personnageId.slice(0, sep);
  const index = personnageId.slice(sep + 1);
  if (!CLIENTS_ILLUSTRES.has(archetypeId) || !/^\d+$/.test(index)) return null;
  return { archetypeId, index };
}

/** Illustration d'un acheteur, ou undefined (célébrité, personnage inconnu →
 *  silhouette). Prend l'id du PERSONNAGE (`ClientPersonnage.id`, ex.
 *  `"bibliophile.1"`) : chaque nom a son portrait. */
export function getClientIllustration(personnageId: string): string | undefined {
  const croisee = CLIENT_ILLUSTRATION_CROISEES[personnageId];
  if (croisee) return croisee.calme;
  const celebrite = slugCelebrite(personnageId);
  if (celebrite) return `/personas/clients/client-celebrite-${celebrite}.webp`;
  const dec = decomposerPersonnageId(personnageId);
  return dec
    ? `/personas/clients/client-${dec.archetypeId}-${dec.index}.webp`
    : undefined;
}

/** Variante fâchée d'un acheteur — générée en image-to-image depuis le
 *  portrait calme (`gen:clients --fache`) pour garder le même personnage. */
export function getClientIllustrationFache(personnageId: string): string | undefined {
  const croisee = CLIENT_ILLUSTRATION_CROISEES[personnageId];
  if (croisee) return croisee.fache;
  const celebrite = slugCelebrite(personnageId);
  if (celebrite)
    return `/personas/clients/client-celebrite-${celebrite}-fache.webp`;
  const dec = decomposerPersonnageId(personnageId);
  return dec
    ? `/personas/clients/client-${dec.archetypeId}-${dec.index}-fache.webp`
    : undefined;
}
