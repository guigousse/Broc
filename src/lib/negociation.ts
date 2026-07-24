import type {
  CleMessageNego,
  MessageNego,
  NegoMode,
  NegoPersona,
  NegociationState,
  Temperament,
} from "@/types/game";

/**
 * Pools FR canoniques des répliques de négociation, indexés par clé
 * (`CleMessageNego`). Source de vérité côté FR ; les overlays `en/nego.ts` /
 * `es/nego.ts` reprennent la même forme. Le rendu localisé passe par
 * `texteNego()` (voir `src/lib/i18n/contenu`).
 *
 * Placeholders : `{prix}` (contre-offres, accord) et `{cibleSecrete}`
 * (diplomate). Une variante peut ne pas utiliser tous les placeholders de sa
 * clé (`tr` ignore les params inutilisés — cf. « petit geste ») ; le test
 * `nego.test.ts` impose seulement qu'aucune variante FR/EN/ES n'en utilise
 * HORS de l'ensemble FR de la clé.
 */
export const POOLS_NEGO_FR: Record<CleMessageNego, string[]> = {
  ouvertureAchat: [
    "« Bonjour ! Approchez, regardez donc. »",
    "« Bienvenue ! Tout est à vendre, ou presque. »",
    "« Bonjour… elle vous a tapé dans l'œil, hein ? »",
  ],
  ouvertureVente: ["Le client vous a fait une offre. À vous de répondre."],
  contreVendeur: [
    "« Bon, allez, je vous fais un petit geste… »",
    "« Hmm. Disons {prix} €. »",
    "« {prix} € et on en parle plus. »",
    "« Je peux descendre à {prix} €, c'est mon mieux. »",
    "« Vous savez discuter, vous… {prix} €. »",
    "« Allez, {prix} €, on coupe la poire en deux. »",
  ],
  contreClient: [
    "« Je peux monter un peu : {prix} €. »",
    "« {prix} €, et c'est ma proposition honnête. »",
    "« Bon, allez, {prix} € si vous me l'enveloppez. »",
    "« On dit {prix} € et on se serre la main ? »",
    "« {prix} €, dernière rallonge. »",
  ],
  refusPoliVendeur: [
    "« Bon, je vais ranger. Mais c'est dommage. »",
    "« Tant pis, à une prochaine fois. »",
    "« Non, je remballe. La journée est longue. »",
  ],
  refusPoliClient: [
    "« Tant pis, je vais voir ailleurs. »",
    "« Je passerai mon tour, merci. »",
    "« Une autre fois, peut-être. »",
  ],
  fache: [
    "« Vous vous moquez de moi ! »",
    "« Vous abusez de ma patience. »",
    "« À ce prix-là, c'est de l'insulte ! »",
    "« On ne me la fait pas. Bonne journée ! »",
  ],
  accord: [
    "Marché conclu à {prix} €.",
    "Vendu à {prix} €.",
    "Affaire conclue : {prix} €.",
    "Tope là — {prix} €.",
  ],
  relance: [
    "« Bon… allez, je vous écoute une dernière fois. »",
    "« Une dernière proposition. La bonne, cette fois. »",
  ],
  diplomate: [
    "« Mon plafond, c'est {cibleSecrete} €. Une dernière fois, je vous écoute. »",
  ],
  bonimentConclu: ["« Marché conclu ! Vous savez y faire… »"],
  bonimentDernierMot: ["« Voilà mon dernier mot : c'est ça ou rien. »"],
  lotGarni: ["« Hmm, les deux ensemble ? Faites-moi un prix… »"],
};

/**
 * Pools FR colorés par tempérament (voir `src/data/temperaments.ts` pour le
 * mapping archétype → tempérament). Seules les situations « à personnalité »
 * sont couvertes — accueil (ouvertureAchat), contre-offres, refus, colère,
 * accord, relance. L'ouverture vente (consigne UI) et les répliques d'atouts
 * (diplomate, boniment, lot garni) restent génériques. Une clé absente d'un
 * tempérament retombe sur `POOLS_NEGO_FR`. Overlays EN/ES/EL :
 * `NEGO_TEMPERAMENT_*` dans `src/lib/i18n/contenu/{en,es,el}/nego.ts`
 * (fallback par langue au rendu).
 */
export const POOLS_NEGO_TEMPERAMENT_FR: Record<
  Temperament,
  Partial<Record<CleMessageNego, string[]>>
> = {
  bourru: {
    ouvertureAchat: [
      "« Quoi ? Ah, bonjour. On regarde avec les yeux, pas avec les mains. »",
      "« B'jour. C'est pas un musée ici, c'est à vendre. »",
    ],
    contreVendeur: [
      "« {prix} €. Et estimez-vous heureux. »",
      "« Pff… {prix} €, dernier carat. »",
      "« J'ai pas que ça à faire. {prix} €, à prendre ou à laisser. »",
    ],
    contreClient: [
      "« {prix} €. C'est déjà trop payé. »",
      "« Je monte à {prix} €, et uniquement parce qu'il va pleuvoir. »",
      "« {prix} €. Discutez encore et je m'en vais. »",
    ],
    refusPoliVendeur: [
      "« C'est terminé. Circulez. »",
      "« Non. Rangez votre monnaie, moi je range mon étal. »",
    ],
    refusPoliClient: [
      "« Bah. Gardez-le, votre machin. »",
      "« J'en voulais pas tant que ça, de toute façon. »",
    ],
    fache: [
      "« Non mais vous m'avez bien regardé ?! »",
      "« Du vent ! On ne traite pas avec les rigolos. »",
    ],
    accord: [
      "« {prix} €, marché conclu. Et pas de réclamation. »",
      "« Bon. {prix} €, tope là, qu'on en finisse. »",
    ],
    relance: ["« Grmph… Bon. Une dernière offre, et la bonne. »"],
  },
  chaleureux: {
    ouvertureAchat: [
      "« Bonjour, bonjour ! Approchez, faites comme chez vous. »",
      "« Ah, une bonne tête ! Bienvenue, regardez tout ce que vous voulez. »",
    ],
    contreVendeur: [
      "« Allez, pour vous : {prix} €, parce que vous avez une bonne tête. »",
      "« On va s'arranger… disons {prix} €, ça vous va ? »",
      "« {prix} €, et je vous raconte son histoire en prime. »",
    ],
    contreClient: [
      "« Je peux aller jusqu'à {prix} €, sans me fâcher avec ma tirelire. »",
      "« {prix} €, et vous me faites bien plaisir. »",
      "« Allez, {prix} €, ça me rappelle tellement de souvenirs… »",
    ],
    refusPoliVendeur: [
      "« Ce sera non, mais revenez me voir, hein ? »",
      "« Une autre fois peut-être, sans rancune. »",
    ],
    refusPoliClient: [
      "« Tant pis pour moi… il était bien joli pourtant. »",
      "« Je vais réfléchir encore un peu, merci du fond du cœur. »",
    ],
    fache: [
      "« Oh… là, vous me faites de la peine. »",
      "« Quand même ! Je vous croyais plus gentil que ça. »",
    ],
    accord: [
      "« {prix} €, et voilà ! Prenez-en bien soin, promis ? »",
      "« Adjugé pour {prix} € — vous faites une affaire, et moi un heureux. »",
    ],
    relance: ["« Allez, je ne sais pas dire non… je vous écoute, une dernière fois. »"],
  },
  radin: {
    ouvertureAchat: [
      "« Bonjour. Je préviens tout de suite : ici, rien n'est donné. »",
      "« Bonjour… vous tombez bien, tout doit partir. Enfin, au bon prix. »",
    ],
    contreVendeur: [
      "« {prix} €… et je perds déjà de l'argent, je vous jure. »",
      "« Bon, {prix} €, mais c'est bien parce que la journée est morte. »",
      "« {prix} €. En dessous, je le garde pour ma belle-sœur. »",
    ],
    contreClient: [
      "« {prix} €, et je saute un déjeuner cette semaine. »",
      "« Je racle les fonds de poche : {prix} €. »",
      "« {prix} €, c'est tout ce que j'ai — j'ai compté deux fois. »",
    ],
    refusPoliVendeur: [
      "« À ce prix-là, je préfère le garder, ça ne prend pas de place. »",
      "« Non non, ça vaudra plus cher l'année prochaine. »",
    ],
    refusPoliClient: [
      "« Trop cher pour moi, tant pis. »",
      "« Mon banquier me tuerait. Je passe. »",
    ],
    fache: [
      "« Vous voulez ma ruine ?! »",
      "« Et puis quoi encore, mes économies avec ? »",
    ],
    accord: [
      "« {prix} €… bon. Mais vous m'arrachez le bras. »",
      "« Va pour {prix} €, et on ne dit à personne que j'ai cédé. »",
    ],
    relance: ["« Attendez… j'ai refait mes comptes. Je vous écoute. »"],
  },
  raffine: {
    ouvertureAchat: [
      "« Bienvenue. Vous avez l'œil, je le vois déjà. »",
      "« Bonjour. Prenez le temps — les belles choses le méritent. »",
    ],
    contreVendeur: [
      "« Cette pièce a une provenance, cela se paie : {prix} €. »",
      "« {prix} €. C'est le prix du goût, cher ami. »",
      "« Disons {prix} €, et vous emportez un fragment d'histoire. »",
    ],
    contreClient: [
      "« {prix} €, pas un de plus — j'ai l'œil pour la juste valeur. »",
      "« Je consens à {prix} €, pour l'amour de l'objet. »",
      "« {prix} €. Au-delà, ce serait de la spéculation. »",
    ],
    refusPoliVendeur: [
      "« Elle attendra un amateur éclairé. Bonne journée. »",
      "« Nous ne parlons visiblement pas la même langue. Sans rancune. »",
    ],
    refusPoliClient: [
      "« Cette pièce ne mérite pas ce tarif, hélas. »",
      "« Je m'incline — mon budget a ses principes. »",
    ],
    fache: [
      "« C'est une insulte au bon goût ! »",
      "« On ne marchande pas ainsi une pièce pareille. Adieu. »",
    ],
    accord: [
      "« {prix} €. Excellent choix, vous avez l'œil. »",
      "« Affaire conclue à {prix} € — elle sera parfaite chez vous. »",
    ],
    relance: ["« Soit. L'élégance commande d'écouter une dernière proposition. »"],
  },
  bavard: {
    ouvertureAchat: [
      "« Ah, bonjour ! Justement je disais à mon voisin d'étal — enfin, approchez ! »",
      "« Bienvenue, bienvenue ! Chaque pièce ici a une histoire, demandez-moi ! »",
    ],
    contreVendeur: [
      "« {prix} € ! Et je vous jure, ma cousine m'en offrait le double — enfin bref, {prix} €. »",
      "« Alors écoutez, entre nous : {prix} €, et c'est un secret. »",
      "« {prix} €, et je vous raconte où je l'ai déniché — histoire incroyable ! »",
    ],
    contreClient: [
      "« {prix} €, et pourtant on dit que je paie toujours trop — enfin, {prix} € ! »",
      "« Bon, entre gens qui savent discuter : {prix} €. »",
      "« {prix} €, et croyez-moi, j'en ai vu passer, des étals ! »",
    ],
    refusPoliVendeur: [
      "« Bon, tant pis ! Mais restez donc, je vous raconte comment je l'ai eu… »",
      "« On n'est pas d'accord, mais c'était un plaisir de bavarder ! »",
    ],
    refusPoliClient: [
      "« Tant pis ! De toute façon ma voiture est déjà pleine, si vous saviez… »",
      "« Je passe — mais quel plaisir de discuter, vraiment ! »",
    ],
    fache: [
      "« Alors là, je reste sans voix. Et croyez-moi, c'est rare ! »",
      "« Vous fâcheriez un moulin à paroles — c'est dire ! »",
    ],
    accord: [
      "« {prix} €, adjugé ! Et cette histoire se racontera, croyez-moi. »",
      "« Tope là, {prix} € ! Vous verrez, tout le marché en parlera. »",
    ],
    relance: ["« Bon, bon… je ne sais pas me taire, alors je vous écoute encore. »"],
  },
  passionne: {
    ouvertureAchat: [
      "« Bonjour ! Tout ici a été choisi avec amour, croyez-moi. »",
      "« Bienvenue… ah, je vois que vous regardez la plus belle pièce. »",
    ],
    contreVendeur: [
      "« {prix} €… c'est une pièce que je connais par cœur, elle les vaut. »",
      "« Pour quelqu'un qui saura l'apprécier : {prix} €. »",
      "« {prix} €. Tenez, regardez cet état — introuvable ailleurs. »",
    ],
    contreClient: [
      "« {prix} € ! Elle me manque depuis des années, celle-là. »",
      "« Je monte à {prix} €, le cœur a ses raisons. »",
      "« {prix} €… ma collection la réclame, soyez chic. »",
    ],
    refusPoliVendeur: [
      "« Alors elle restera avec moi. On ne brade pas ce qu'on aime. »",
      "« Tant pis. Elle trouvera son connaisseur. »",
    ],
    refusPoliClient: [
      "« Le cœur y était, pas le portefeuille. Dommage. »",
      "« Elle m'aurait comblé… mais pas à ce prix. Tant pis. »",
    ],
    fache: [
      "« On ne parle pas ainsi d'une pièce pareille ! »",
      "« Vous n'avez donc aucun respect pour la belle ouvrage ?! »",
    ],
    accord: [
      "« {prix} € — elle part en de bonnes mains, ça me console. »",
      "« Marché conclu à {prix} €. Vous tenez un petit trésor, vous savez. »",
    ],
    relance: ["« Pour elle, je veux bien tendre l'oreille une dernière fois. »"],
  },
};

/**
 * Construit un `MessageNego` : tire une variante dans le pool FR (le modulo au
 * rendu absorbe les tailles de pool différentes entre langues) et fige les
 * paramètres d'interpolation. Ne résout PAS le texte (fait à l'affichage).
 * Avec `temperament`, la variante est tirée dans le pool coloré si la clé y
 * existe (le tempérament est alors embarqué dans le message pour le rendu).
 */
export function pickMessage(
  cle: CleMessageNego,
  params?: { prix?: number; cibleSecrete?: number },
  temperament?: Temperament,
): MessageNego {
  const poolColore = temperament
    ? POOLS_NEGO_TEMPERAMENT_FR[temperament][cle]
    : undefined;
  const pool = poolColore ?? POOLS_NEGO_FR[cle];
  const variante = Math.floor(Math.random() * pool.length);
  return {
    cle,
    variante,
    ...(params ? { params } : {}),
    ...(poolColore ? { temperament } : {}),
  };
}

/**
 * Crée l'état initial d'une négociation.
 *
 * @param mode "achat" → l'adverse part haut, descend vers cibleSecrete (prixMinAccept).
 *             "vente" → l'adverse part bas (offreInitiale), monte vers cibleSecrete (prixMax).
 * @param prixDepartAdverse position initiale du curseur adverse.
 * @param cibleSecrete prix limite que l'adverse refuse de franchir.
 */
export function ouvrirNegociation(
  mode: NegoMode,
  prixDepartAdverse: number,
  cibleSecrete: number,
  temperament?: Temperament,
): NegociationState {
  return {
    mode,
    tour: 0,
    humeur: 0,
    prixAdverseCourant: prixDepartAdverse,
    cibleSecrete,
    derniereOffreJoueur: null,
    statut: "en_cours",
    message: pickMessage(
      mode === "achat" ? "ouvertureAchat" : "ouvertureVente",
      undefined,
      temperament,
    ),
    ...(temperament ? { temperament } : {}),
  };
}

/**
 * Calcule la nouvelle position du curseur adverse après une contre-offre.
 * Achat : descend depuis prixAdverseCourant vers cibleSecrete (prixMin).
 * Vente : monte depuis prixAdverseCourant vers cibleSecrete (prixMax).
 */
function adversePushVers(
  mode: NegoMode,
  prixCourant: number,
  cible: number,
  elanPct: number,
): number {
  // Arrondi VERS la cible + concession minimale de 1 € : sur les petits prix,
  // un arrondi au plus proche recollait au prix courant et figeait la
  // négociation (le vendeur « concédait » le même prix à chaque tour).
  if (mode === "achat") {
    const brut = prixCourant - (prixCourant - cible) * elanPct;
    return Math.max(cible, Math.min(prixCourant - 1, Math.floor(brut)));
  }
  const brut = prixCourant + (cible - prixCourant) * elanPct;
  return Math.min(cible, Math.max(prixCourant + 1, Math.ceil(brut)));
}

/** Vrai si l'offre du joueur rejoint le prix adverse (condition d'accord). */
function offreRejoint(mode: NegoMode, offre: number, prixAdverse: number): boolean {
  return mode === "achat" ? offre >= prixAdverse : offre <= prixAdverse;
}

/**
 * Vrai si l'offre est insultante (déclenche colère).
 * Achat : offre < prixAdverseCourant × (1 − tolerance).
 * Vente : offre > prixAdverseCourant × (1 + tolerance).
 */
function offreInsultante(
  mode: NegoMode,
  offre: number,
  prixAdverseCourant: number,
  tolerancePct: number,
): boolean {
  if (mode === "achat") {
    return offre < prixAdverseCourant * (1 - tolerancePct);
  }
  return offre > prixAdverseCourant * (1 + tolerancePct);
}

/**
 * Distance normalisée entre l'offre et le seuil d'insulte.
 * 0 = offre proche d'être acceptée ; 1 = offre à la limite de l'insulte.
 * Une offre encore plus basse (au-delà du seuil) est traitée par
 * offreInsultante() en amont — on clamp ici à [0, 1].
 */
function distanceVersInsulte(
  mode: NegoMode,
  offre: number,
  prixAdverseCourant: number,
  tolerancePct: number,
): number {
  const seuil = prixAdverseCourant * tolerancePct;
  if (seuil <= 0) return 0;
  const delta =
    mode === "achat" ? prixAdverseCourant - offre : offre - prixAdverseCourant;
  return Math.min(1, Math.max(0, delta / seuil));
}

/**
 * Fonction pure : prend l'état + persona + offre joueur, renvoie le nouvel état.
 * Aucun side-effect.
 */
export function proposerOffre(
  nego: NegociationState,
  persona: NegoPersona,
  offre: number,
): NegociationState {
  if (nego.statut !== "en_cours") return nego;
  const tour = nego.tour + 1;
  const pressionTour = tour / persona.patience;

  // 1. Accord — quelle que soit l'humeur, l'accord conclu apaise.
  if (offreRejoint(nego.mode, offre, nego.prixAdverseCourant)) {
    return {
      ...nego,
      tour,
      humeur: Math.min(nego.humeur, 0.3),
      derniereOffreJoueur: offre,
      statut: "conclu",
      message: pickMessage("accord", { prix: offre }, nego.temperament),
    };
  }

  // Humeur — montée principalement portée par la distance de l'offre au prix
  // adverse. Une offre très basse fait grimper l'humeur fortement, même au
  // tour 1. La pression du tour ajoute une pousse secondaire.
  const distance = distanceVersInsulte(
    nego.mode,
    offre,
    nego.prixAdverseCourant,
    persona.tolerancePct,
  );
  const humeur = Math.min(1, 0.85 * distance + 0.3 * pressionTour);

  // 2. Colère franche (offre insultante — au-delà du seuil de tolérance)
  if (offreInsultante(nego.mode, offre, nego.prixAdverseCourant, persona.tolerancePct)) {
    return {
      ...nego,
      tour,
      humeur: 1,
      derniereOffreJoueur: offre,
      statut: "fache",
      message: pickMessage("fache", undefined, nego.temperament),
    };
  }

  // 3. Fin de négo probabiliste, pilotée par l'humeur. Plus l'humeur est
  // élevée (rouge), plus la probabilité tend vers 1. Le sangFroid atténue.
  // Humeur élevée → fache ; humeur moyenne → refus poli.
  const chanceFin = Math.pow(humeur, 1.5) * (1 - persona.sangFroid * 0.5);
  if (Math.random() < chanceFin) {
    if (humeur >= 0.6) {
      return {
        ...nego,
        tour,
        humeur: 1,
        derniereOffreJoueur: offre,
        statut: "fache",
        message: pickMessage("fache", undefined, nego.temperament),
      };
    }
    const refusCle: CleMessageNego =
      nego.mode === "achat" ? "refusPoliVendeur" : "refusPoliClient";
    return {
      ...nego,
      tour,
      humeur,
      derniereOffreJoueur: offre,
      statut: "refus_poli",
      message: pickMessage(refusCle, undefined, nego.temperament),
    };
  }

  // 4. Refus poli (patience épuisée)
  if (tour >= persona.patience) {
    const refusCle: CleMessageNego =
      nego.mode === "achat" ? "refusPoliVendeur" : "refusPoliClient";
    return {
      ...nego,
      tour,
      humeur: Math.max(humeur, 0.8),
      derniereOffreJoueur: offre,
      statut: "refus_poli",
      message: pickMessage(refusCle, undefined, nego.temperament),
    };
  }

  // 5. Contre-offre
  const nouveauPrix = adversePushVers(
    nego.mode,
    nego.prixAdverseCourant,
    nego.cibleSecrete,
    persona.elanPct,
  );

  // Si la concession dépasse l'offre du joueur, l'adverse s'aligne et accepte
  // — il serait illogique de surenchérir contre le joueur (vendeur sous l'offre
  // d'achat, ou client au-dessus du prix demandé).
  const accordParAlignement =
    nego.mode === "achat" ? nouveauPrix <= offre : nouveauPrix >= offre;
  if (accordParAlignement) {
    return {
      ...nego,
      tour,
      humeur: Math.min(nego.humeur, 0.3),
      prixAdverseCourant: offre,
      derniereOffreJoueur: offre,
      statut: "conclu",
      message: pickMessage("accord", { prix: offre }, nego.temperament),
    };
  }

  const contreCle: CleMessageNego =
    nego.mode === "achat" ? "contreVendeur" : "contreClient";
  return {
    ...nego,
    tour,
    humeur,
    prixAdverseCourant: nouveauPrix,
    derniereOffreJoueur: offre,
    statut: "en_cours",
    message: pickMessage(contreCle, { prix: nouveauPrix }, nego.temperament),
  };
}

/** La Tchatche : le vendeur se ravise — négociation rouverte, humeur remise à neutre. Pure. */
export const HUMEUR_RELANCE = 0.2;

export function relancerNegociation(nego: NegociationState): NegociationState {
  if (nego.statut !== "fache" && nego.statut !== "refus_poli") return nego;
  return {
    ...nego,
    statut: "en_cours",
    humeur: HUMEUR_RELANCE,
    message: pickMessage("relance", undefined, nego.temperament),
  };
}
