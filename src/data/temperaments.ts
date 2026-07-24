import type { Temperament, VendeurArchetypeId } from "@/types/game";

/**
 * Tempérament de dialogue de chaque archétype — vendeurs de chinage
 * (`VendeurArchetypeId`) ET acheteurs de vente (`ClientArchetype.id`).
 * Le tempérament choisit le pool de répliques colorées de la négociation
 * (voir `POOLS_NEGO_TEMPERAMENT_FR` dans `src/lib/negociation.ts`).
 *
 * La couverture des deux registres est verrouillée par
 * `src/data/temperaments.test.ts` : tout nouvel archétype doit être mappé ici.
 */
export const TEMPERAMENT_VENDEURS: Record<VendeurArchetypeId, Temperament> = {
  naif: "chaleureux",
  grincheux: "bourru",
  bonhomme: "chaleureux",
  malin: "radin",
  mamie: "chaleureux",
  antiquaire: "raffine",
  pipelette: "bavard",
  videcave: "bourru",
  bonimenteur: "bavard",
  disquaire: "passionne",
  joueur: "radin",
  setdesigner: "raffine",
  modeuse: "raffine",
  esthete: "raffine",
};

/** Acheteurs (mode vente) — clés = `ClientArchetype.id` de `clients.ts`. */
export const TEMPERAMENT_CLIENTS: Record<string, Temperament> = {
  retraite_chineur: "chaleureux",
  passionnee_artdeco: "raffine",
  brocanteur_concurrent: "bourru",
  collectionneur_musique: "passionne",
  gamer_nostalgique: "passionne",
  bibliophile: "passionne",
  bricoleur_dimanche: "radin",
  etudiant_fauche: "radin",
  snob_bourgeois: "raffine",
  touriste_perdu: "chaleureux",
  famille_dimanche: "chaleureux",
  decorateur: "raffine",
  amateur_vintage: "passionne",
  notable_curieux: "raffine",
  opportuniste: "bourru",
  galeriste: "raffine",
};

/**
 * Tempérament d'un persona de négociation, quel que soit son camp.
 * `undefined` (archétype inconnu, ex. célébrité) → répliques génériques.
 */
export function temperamentDe(archetype: string): Temperament | undefined {
  return (
    TEMPERAMENT_VENDEURS[archetype as VendeurArchetypeId] ??
    TEMPERAMENT_CLIENTS[archetype]
  );
}
