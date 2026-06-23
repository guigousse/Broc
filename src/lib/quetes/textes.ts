import type { EtatObjet } from "@/types/game";

interface Gabarit {
  titre: string;
  corps: string[];
}

/** `{objets}` = liste des objets, `{etat}` = mention d'état min (ou ""). */
const GENERIQUE: Gabarit[] = [
  { titre: "Recherche : {objets}", corps: ["Bonjour,", "Je cherche {objets}{etat}. Si tu mets la main dessus, fais-moi signe — je paie bien."] },
];

const PAR_COMMANDITAIRE: Record<string, Gabarit[]> = {
  "jeux-video": [
    { titre: "Pièce manquante", corps: ["Salut !", "Il me manque {objets}{etat} pour compléter ma collec'. Tu peux dégoter ça ?"] },
    { titre: "Pour la vitrine rétro", corps: ["Hello,", "Je monte une vitrine et j'ai besoin de {objets}{etat}. Compte sur toi !"] },
  ],
  "set-designer": [
    { titre: "Besoin déco", corps: ["Bonjour,", "Pour un décor, il me faut {objets}{etat}. Le détail qui fait vrai."] },
    { titre: "Sur un plateau", corps: ["Salut,", "Mon plateau de tournage réclame {objets}{etat}. Sans ça, l'image sonne faux."] },
  ],
  mode: [
    { titre: "Pièce vintage", corps: ["Cher chineur,", "Ma collection réclame {objets}{etat}. Le bon vêtement raconte une histoire."] },
    { titre: "Inspiration défilé", corps: ["Bonjour,", "Je prépare un défilé et {objets}{etat} m'inspirerait. Tu peux trouver ça ?"] },
  ],
  art: [
    { titre: "Pour la galerie", corps: ["Cher ami,", "J'aimerais accrocher {objets}{etat}. Une belle pièce, naturellement."] },
    { titre: "Acquisition", corps: ["Cher confrère,", "Un amateur éclairé recherche {objets}{etat} pour sa collection. Faites-moi signe."] },
  ],
};

export function genererTexte(
  commanditaireId: string,
  nomsObjets: string[],
  etatMin: EtatObjet | undefined,
  rng: () => number = Math.random,
): Gabarit {
  const gabarits = PAR_COMMANDITAIRE[commanditaireId] ?? GENERIQUE;
  const g = gabarits[Math.floor(rng() * gabarits.length)] ?? gabarits[0];
  const objets =
    nomsObjets.length === 1
      ? `« ${nomsObjets[0]} »`
      : nomsObjets.map((n) => `« ${n} »`).join(", ");
  const etat = etatMin ? ` (état min : ${etatMin})` : "";
  const fill = (s: string) => s.replaceAll("{objets}", objets).replaceAll("{etat}", etat);
  return { titre: fill(g.titre), corps: g.corps.map(fill) };
}
