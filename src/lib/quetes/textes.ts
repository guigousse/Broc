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
  | `${"generique" | "jeux-video" | "set-designer" | "mode" | "art"}#${number}`
  | `${"rares" | "benefice" | "chiffre" | "marge" | "categorie"}#${number}`;

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

/**
 * Gabarits des formes CHIFFRÉES (sans objet nommé). Marques disponibles :
 * `{nombre}`, `{montant}` (déjà formaté « 1 800 € »), `{categorie}`.
 * Une famille par forme — la clé est produite par `contenuFormeChiffree`.
 */
const CHIFFREES: Record<string, Gabarit[]> = {
  rares: [
    { titre: "L'œil du connaisseur", corps: ["Bonjour,", "On dit que tu as l'œil. Rapporte {nombre} pièces rares de tes prochaines brocantes, et je saurai à qui m'adresser désormais."] },
    { titre: "Rien que du beau", corps: ["Cher chineur,", "Le tout-venant ne m'intéresse plus. {nombre} pièces rares, pas une de moins — je veux voir ce que tu sais dénicher."] },
  ],
  benefice: [
    { titre: "La marge, mon garçon", corps: ["Salut,", "Acheter, tout le monde sait faire. Dégage {montant} de bénéfice cette semaine et on reparlera de ton métier."] },
    { titre: "Le nerf de la guerre", corps: ["Bonjour,", "Un pari : {montant} de bénéfice d'ici la fin de la semaine. Tu tiens, je paie."] },
  ],
  chiffre: [
    { titre: "Faire tourner la boutique", corps: ["Bonjour,", "Peu importe la marge : je veux voir du mouvement. {montant} de ventes cette semaine."] },
    { titre: "Le tiroir-caisse chante", corps: ["Salut,", "Fais chanter ta caisse — {montant} encaissés avant dimanche."] },
  ],
  marge: [
    { titre: "Le coup du siècle", corps: ["Cher confrère,", "Tout le monde vend beaucoup. Peu réussissent LE coup. Fais {montant} de marge sur une seule vente."] },
    { titre: "Une seule suffit", corps: ["Bonjour,", "Une belle vente vaut dix médiocres. {montant} de marge, sur un seul objet."] },
  ],
  categorie: [
    { titre: "Spécialiste demandé", corps: ["Bonjour,", "J'ai besoin de quelqu'un qui connaît son rayon. Vends {nombre} objets de la catégorie {categorie} et tu auras ma confiance."] },
    { titre: "Vider le rayon", corps: ["Salut,", "Mon stock déborde du côté {categorie}. Écoule-m'en {nombre} et je te revaudrai ça."] },
  ],
};

/** Format monétaire FR des gabarits : « 1 800 € » (espace insécable fine). */
function montantFr(n: number): string {
  return `${n.toLocaleString("fr-FR")} €`;
}

/**
 * Nombre de variantes disponibles pour une famille de gabarits chiffrés.
 * Accesseur en lecture seule réservé aux tests : permet de balayer
 * exhaustivement les variantes d'une famille sans dupliquer le compte en dur.
 */
export function nombreVariantesChiffrees(gabaritCle: string): number {
  return (CHIFFREES[gabaritCle] ?? CHIFFREES.benefice).length;
}

/**
 * Nombre de variantes disponibles pour une famille « objet nommé »
 * (generique + commanditaires). Même contrat que `nombreVariantesChiffrees`,
 * et même résolution de repli que `genererTexte` (commanditaire connu sinon
 * `GENERIQUE`) : accesseur en lecture seule réservé aux tests, pour que le
 * nombre de variantes attendu par langue se déduise du FR canonique plutôt
 * que d'être recopié en dur.
 */
export function nombreVariantesCommanditaire(gabaritCle: string): number {
  return (PAR_COMMANDITAIRE[gabaritCle] ?? GENERIQUE).length;
}

/**
 * Texte FR d'une quête chiffrée. Même contrat que `genererTexte` : le FR est
 * persisté dans le payload, le `gabaritId` permet la régénération dans les
 * autres langues à l'affichage.
 */
export function genererTexteChiffre(
  gabaritCle: string,
  params: { nombre?: number; montant?: number; categorie?: string },
  rng: () => number = Math.random,
): TexteGenere {
  const gabarits = CHIFFREES[gabaritCle] ?? CHIFFREES.benefice;
  const cle = CHIFFREES[gabaritCle] ? gabaritCle : "benefice";
  const index = Math.floor(rng() * gabarits.length);
  const g = gabarits[index] ?? gabarits[0];
  const indexReel = gabarits[index] ? index : 0;
  const fill = (s: string) =>
    s
      .replaceAll("{nombre}", String(params.nombre ?? 0))
      .replaceAll("{montant}", montantFr(params.montant ?? 0))
      .replaceAll("{categorie}", params.categorie ?? "");
  return {
    titre: fill(g.titre),
    corps: g.corps.map(fill),
    gabaritId: `${cle}#${indexReel}` as GabaritQueteId,
  };
}

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
