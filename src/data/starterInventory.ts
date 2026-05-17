import type { Objet } from "@/types/game";

export function createStarterInventory(): Objet[] {
  return [
    {
      id: crypto.randomUUID(),
      templateId: "starter.fer_a_repasser",
      nom: "Vieux fer à repasser",
      categorie: "Maison",
      prixReferenceReel: 8,
      etat: "Mauvais",
      rarete: "commun",
    },
    {
      id: crypto.randomUUID(),
      templateId: "starter.assiette_decorative",
      nom: "Assiette décorative",
      categorie: "Maison",
      prixReferenceReel: 5,
      etat: "Bon",
      rarete: "commun",
    },
    {
      id: crypto.randomUUID(),
      templateId: "starter.lampe_chevet_ebrechee",
      nom: "Lampe de chevet ébréchée",
      categorie: "Maison",
      prixReferenceReel: 6,
      etat: "Mauvais",
      rarete: "commun",
    },
  ];
}
