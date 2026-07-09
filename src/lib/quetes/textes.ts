import type { EtatObjet } from "@/types/game";

interface Gabarit {
  titre: string;
  corps: string[];
}

/**
 * Id traçable du gabarit choisi : `"cle#index"`. La clé est le commanditaire
 * (ou `generique` en repli) ; l'index est la variante tirée. Persisté dans le
 * payload du courrier pour permettre la régénération du texte par langue (i18n).
 */
export type GabaritQueteId =
  `${"generique" | "jeux-video" | "set-designer" | "mode" | "art"}#${number}`;

/** Résultat de `genererTexte` : le texte FR mis en forme + le gabarit tiré. */
export interface TexteGenere {
  titre: string;
  corps: string[];
  gabaritId: GabaritQueteId;
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
): TexteGenere {
  const parCommanditaire = PAR_COMMANDITAIRE[commanditaireId];
  const cle = parCommanditaire ? commanditaireId : "generique";
  const gabarits = parCommanditaire ?? GENERIQUE;
  const index = Math.floor(rng() * gabarits.length);
  const g = gabarits[index] ?? gabarits[0];
  const objets =
    nomsObjets.length === 1
      ? `« ${nomsObjets[0]} »`
      : nomsObjets.map((n) => `« ${n} »`).join(", ");
  const etat = etatMin ? ` (état min : ${etatMin})` : "";
  const fill = (s: string) => s.replaceAll("{objets}", objets).replaceAll("{etat}", etat);
  const indexReel = gabarits[index] ? index : 0;
  return {
    titre: fill(g.titre),
    corps: g.corps.map(fill),
    gabaritId: `${cle}#${indexReel}` as GabaritQueteId,
  };
}
