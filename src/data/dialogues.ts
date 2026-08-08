/**
 * Séquences de dialogue du grand-père (SP1 trame scénaristique).
 * FR = langue source ; overlays EN/ES dans src/lib/i18n/contenu/{en,es}/dialogues.ts.
 * Les ids sont stables (jamais en save, mais clés d'overlay i18n).
 */

export type HumeurPnj = "souriant" | "emu" | "songeur" | "rieur";

export interface DialogueLigne {
  texte: string;
  humeur: HumeurPnj;
}

export interface DialogueSequence {
  id: string;
  lignes: DialogueLigne[];
}

/** Portraits par humeur. */
export const GRAND_PERE_PORTRAITS: Record<HumeurPnj, string> = {
  souriant: "/personas/grand-pere/souriant.webp",
  emu: "/personas/grand-pere/emu.webp",
  songeur: "/personas/grand-pere/songeur.webp",
  rieur: "/personas/grand-pere/rieur.webp",
};

export const SEQUENCES_TUTORIEL: Record<string, DialogueSequence> = {
  tuto_accueil: {
    id: "tuto_accueil",
    lignes: [
      { humeur: "souriant", texte: "Te voilà enfin ! Entre, entre… Attention à la pile de journaux, elle est là depuis 1987." },
      { humeur: "emu", texte: "Cinquante ans que je tiens cette boutique. Chaque objet ici a une histoire… et mes genoux aussi, hélas." },
      { humeur: "songeur", texte: "Il est temps que je passe la main. Et c'est toi que j'ai choisi. Ne fais pas cette tête — tu vas adorer." },
      { humeur: "souriant", texte: "On commence par le commencement : la brocante. La porte est par là, suis-moi." },
    ],
  },
  tuto_chine_entree: {
    id: "tuto_chine_entree",
    lignes: [
      { humeur: "souriant", texte: "Ah, l'odeur des vieilleries au petit matin… Aujourd'hui, c'est moi qui guide : quatre objets, quatre leçons." },
      { humeur: "songeur", texte: "Regarde ce tourne-disque. Joli, hein ? Déplie « Négocier » et propose-lui trois fois rien — on verra bien ce que ça donne." },
    ],
  },
  tuto_nego_echec_avant: {
    id: "tuto_nego_echec_avant",
    lignes: [
      { humeur: "rieur", texte: "Vas-y, ose : glisse le curseur tout en bas et propose. Au pire, il grogne." },
    ],
  },
  tuto_nego_echec_apres: {
    id: "tuto_nego_echec_apres",
    lignes: [
      { humeur: "rieur", texte: "Et voilà, il est vexé ! Une offre trop basse, c'est comme marcher sur ses plates-bandes : chaque vendeur a son seuil… et son caractère." },
      { humeur: "songeur", texte: "Avec l'expérience — des niveaux, des compétences, l'œil qui se fait — tu sauras jusqu'où descendre sans froisser personne." },
      { humeur: "souriant", texte: "Ça arrive aux meilleurs. Allez, carte suivante : je te montre l'inverse." },
    ],
  },
  tuto_achat_direct_avant: {
    id: "tuto_achat_direct_avant",
    lignes: [
      { humeur: "songeur", texte: "Cette carafe en cristal… à ce prix, c'est une affaire. Parfois on ne négocie pas : on tend les billets avant qu'un autre le fasse." },
    ],
  },
  tuto_achat_direct_apres: {
    id: "tuto_achat_direct_apres",
    lignes: [
      { humeur: "souriant", texte: "Bien. Reconnaître une bonne affaire au premier coup d'œil, c'est déjà du métier." },
    ],
  },
  tuto_nego_un_avant: {
    id: "tuto_nego_un_avant",
    lignes: [
      { humeur: "souriant", texte: "Une manette Vibraduo ! Les collectionneurs en raffolent. Cette fois, négocie pour de vrai : reste dans la zone du curseur, ni trop bas, ni trop haut." },
    ],
  },
  tuto_nego_un_apres: {
    id: "tuto_nego_un_apres",
    lignes: [
      { humeur: "rieur", texte: "Ta première négo ! Tu as vu l'aller-retour ? Toi qui montes, lui qui descend… et on se retrouve au milieu." },
    ],
  },
  tuto_nego_deux_avant: {
    id: "tuto_nego_deux_avant",
    lignes: [
      { humeur: "emu", texte: "Oh… une peluche en mohair. Ta grand-mère avait la même sur son fauteuil. Négocie-la-moi gentiment, tu veux ?" },
    ],
  },
  tuto_nego_deux_apres: {
    id: "tuto_nego_deux_apres",
    lignes: [
      { humeur: "souriant", texte: "Négocié comme un chef ! Prends-en soin, de celle-là… j'ai ma petite idée sur son avenir." },
    ],
  },
  tuto_chine_sortir: {
    id: "tuto_chine_sortir",
    lignes: [
      { humeur: "souriant", texte: "On a assez dépensé pour aujourd'hui — garde des sous pour la suite. Jette un œil aux derniers étals si tu veux, puis passe la sortie." },
    ],
  },
  tuto_retour: {
    id: "tuto_retour",
    lignes: [
      { humeur: "souriant", texte: "Trois trouvailles d'un coup ! Mais un brocanteur qui empile, c'est un brocanteur qui perd. Chaque chose à sa place." },
      { humeur: "songeur", texte: "Ouvre le Stockage, en bas — je te fais visiter la réserve." },
    ],
  },
  tuto_peluche_collection: {
    id: "tuto_peluche_collection",
    lignes: [
      { humeur: "emu", texte: "La peluche… Ne la vends pas, celle-là. Il y a des objets qu'on garde — c'est ça, une collection." },
      { humeur: "souriant", texte: "Envoie-la dans ta collection : touche son petit bouton, là." },
    ],
  },
  tuto_collection_lecon: {
    id: "tuto_collection_lecon",
    lignes: [
      { humeur: "souriant", texte: "Tu vois ce chiffre ? La valeur de ta collection. C'est elle qui fait ta réputation de brocanteur." },
      { humeur: "rieur", texte: "Et regarde : le Marché aux puces du dimanche t'ouvre déjà ses portes. On commence à parler de toi, petit !" },
      { humeur: "songeur", texte: "Maintenant, la vente. Retourne au bureau — la porte nous attend." },
    ],
  },
  tuto_colis_cadeau: {
    id: "tuto_colis_cadeau",
    lignes: [
      { humeur: "emu", texte: "Une dernière chose. Ce colis, c'est de ma part : quelques pièces de la boutique pour te lancer." },
      { humeur: "souriant", texte: "Tu as l'œil, tu as la main… le reste viendra tout seul. Ouvre-le, et au travail !" },
    ],
  },
  tuto_vente_entree: {
    id: "tuto_vente_entree",
    lignes: [
      { humeur: "songeur", texte: "Les clients vont venir. Écoute-les, laisse-les parler… et ne lâche jamais ton prix trop vite." },
    ],
  },
  tuto_vente_faite: {
    id: "tuto_vente_faite",
    lignes: [
      { humeur: "rieur", texte: "Et voilà ta première vente ! Le tiroir-caisse qui chante, ça ne s'oublie jamais." },
      { humeur: "souriant", texte: "Referme l'étal quand tu veux, et rentrons. J'ai quelque chose pour toi à la maison." },
    ],
  },
  tuto_conclusion: {
    id: "tuto_conclusion",
    lignes: [
      { humeur: "emu", texte: "Tu as l'œil, et la main… il ne te manque que les années. La boutique est entre de bonnes mains." },
      { humeur: "souriant", texte: "Tiens : mon carnet de commandes. Les gens y notent ce qu'ils cherchent. Ouvre-le donc — j'ai justement quelque chose à y inscrire." },
      { humeur: "songeur", texte: "Et le facteur est passé : une lettre de ta mère, je crois. Allez, au travail… je reste dans mon fauteuil, si tu as besoin de moi." },
    ],
  },
};

/** Événement d'anniversaire (11 juin) : mini-tuto des vinyles. */
export const SEQUENCES_ANNIVERSAIRE: Record<string, DialogueSequence> = {
  anniv_cadeau: {
    id: "anniv_cadeau",
    lignes: [
      { humeur: "emu", texte: "Joyeux anniversaire, petit ! Ta mère n'oublie jamais la date — et elle sait choisir." },
      { humeur: "souriant", texte: "Un 33 tours de jazz ! File au Stockage l'ajouter à ta collection — un vinyle rangé, c'est une musique gagnée." },
      { humeur: "songeur", texte: "Ensuite, reviens au bureau : le gramophone saura le faire chanter." },
    ],
  },
  anniv_fin: {
    id: "anniv_fin",
    lignes: [
      { humeur: "rieur", texte: "Ah, ce swing ! Ça me rajeunit de quarante ans." },
      { humeur: "souriant", texte: "D'autres vinyles dorment dans les brocantes. N'hésite jamais à les ajouter à ta collection — chaque disque est une musique à découvrir." },
    ],
  },
  anniv_cadeau_recurrent: {
    id: "anniv_cadeau_recurrent",
    lignes: [
      { humeur: "emu", texte: "Joyeux anniversaire, petit ! Ta mère n'oublie jamais la date — cette année encore, le facteur est arrivé en sifflotant." },
      { humeur: "souriant", texte: "Encore un disque pour ta collection ! File l'ajouter au Stockage — le gramophone n'attend que lui." },
    ],
  },
};

/** Mini-tuto de la Gazette : première édition offerte par le grand-père. */
export const SEQUENCES_GAZETTE: Record<string, DialogueSequence> = {
  gazette_tuto: {
    id: "gazette_tuto",
    lignes: [
      { humeur: "souriant", texte: "Ah, tu l'as trouvée ! La Gazette des Chineurs — cinquante ans que je la lis chaque lundi. Celle-ci, c'est moi qui te l'offre." },
      { humeur: "songeur", texte: "Regarde la rubrique des tendances : elle te dit quelles catégories ont la cote cette semaine. Plus tu deviens connaisseur, plus elle t'en révèle." },
      { humeur: "souriant", texte: "Le bulletin météo, lui, annonce le temps sur les brocantes — et l'affluence qui va avec. Il se lira avec la compétence « Bulletin météo »." },
      { humeur: "songeur", texte: "Le carnet mondain murmure quelle célébrité visitera quelle brocante… Des affaires en or — pour qui a la compétence « Carnet mondain »." },
      { humeur: "rieur", texte: "Et avec de l'« Influence », tu pourras même faire réécrire un article qui ne te plaît pas. Ah, la presse…" },
      { humeur: "souriant", texte: "Dès lundi prochain, le kiosque la déposera devant la porte. Quelques pièces bien investies, crois-moi. Je pose celle-ci sur le coin du bureau." },
    ],
  },
};

export const TOUTES_SEQUENCES: DialogueSequence[] = [
  ...Object.values(SEQUENCES_TUTORIEL),
  ...Object.values(SEQUENCES_ANNIVERSAIRE),
  ...Object.values(SEQUENCES_GAZETTE),
];
