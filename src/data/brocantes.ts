import type { Brocante } from "@/types/game";

export const BROCANTES: Brocante[] = [
  {
    id: "vide-grenier-quartier",
    nom: "Vide-grenier du quartier",
    description:
      "Quelques tables dépliées sur la place. Petits prix, peu de pépites, mais on doit bien commencer quelque part.",
    ambiance: "Familial",
    taillePool: 6,
    conditionDeblocage: { type: "depart" },
  },
  {
    id: "marche-aux-puces",
    nom: "Marché aux puces du dimanche",
    description:
      "Le grand rendez-vous des chineurs. Plus de monde, plus de choix, des vendeurs plus malins.",
    ambiance: "Dense",
    taillePool: 9,
    conditionDeblocage: { type: "jour", jour: 5 },
  },
  {
    id: "deballage-collectionneurs",
    nom: "Déballage des collectionneurs",
    description:
      "Réservé aux portefeuilles bien garnis. Les pièces rares y circulent, mais à quel prix ?",
    ambiance: "Spécialisé",
    taillePool: 8,
    conditionDeblocage: { type: "budget", montant: 500 },
  },
];

export function getBrocanteById(id: string): Brocante | undefined {
  return BROCANTES.find((b) => b.id === id);
}
