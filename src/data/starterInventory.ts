import type { Objet } from "@/types/game";

export function createStarterInventory(): Objet[] {
  return [
    {
      id: crypto.randomUUID(),
      nom: "Vieux fer à repasser",
      categorie: "Maison",
      prixReferenceReel: 8,
      etat: "Mauvais",
    },
    {
      id: crypto.randomUUID(),
      nom: "Assiette décorative",
      categorie: "Maison",
      prixReferenceReel: 5,
      etat: "Bon",
    },
    {
      id: crypto.randomUUID(),
      nom: "Lampe de chevet ébréchée",
      categorie: "Maison",
      prixReferenceReel: 6,
      etat: "Mauvais",
    },
  ];
}
