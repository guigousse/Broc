import type {
  CleMessageNego,
  MessageNego,
  NegoMode,
  NegoPersona,
  NegociationState,
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
  ouvertureAchat: ["Faites glisser votre curseur pour proposer un prix."],
  ouvertureVente: ["Le client vous a fait une offre. À vous de répondre."],
  contreVendeur: [
    "« Bon, allez, je vous fais un petit geste… »",
    "« Hmm. Disons {prix} €. »",
    "« {prix} € et on en parle plus. »",
    "« Je peux descendre à {prix} €, c'est mon mieux. »",
  ],
  contreClient: [
    "« Je peux monter un peu : {prix} €. »",
    "« {prix} €, et c'est ma proposition honnête. »",
    "« Bon, allez, {prix} € si vous me l'enveloppez. »",
  ],
  refusPoliVendeur: [
    "« Bon, je vais ranger. Mais c'est dommage. »",
    "« Tant pis, à une prochaine fois. »",
  ],
  refusPoliClient: [
    "« Tant pis, je vais voir ailleurs. »",
    "« Je passerai mon tour, merci. »",
  ],
  fache: [
    "« Vous vous moquez de moi ! »",
    "« Vous abusez de ma patience. »",
  ],
  accord: [
    "Marché conclu à {prix} €.",
    "Vendu à {prix} €.",
  ],
  relance: ["« Bon… allez, je vous écoute une dernière fois. »"],
  diplomate: [
    "« Mon plafond, c'est {cibleSecrete} €. Une dernière fois, je vous écoute. »",
  ],
  bonimentConclu: ["« Marché conclu ! Vous savez y faire… »"],
  bonimentDernierMot: ["« Voilà mon dernier mot : c'est ça ou rien. »"],
  lotGarni: ["« Hmm, les deux ensemble ? Faites-moi un prix… »"],
};

/**
 * Construit un `MessageNego` : tire une variante dans le pool FR (le modulo au
 * rendu absorbe les tailles de pool différentes entre langues) et fige les
 * paramètres d'interpolation. Ne résout PAS le texte (fait à l'affichage).
 */
export function pickMessage(
  cle: CleMessageNego,
  params?: { prix?: number; cibleSecrete?: number },
): MessageNego {
  const variante = Math.floor(Math.random() * POOLS_NEGO_FR[cle].length);
  return params ? { cle, variante, params } : { cle, variante };
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
): NegociationState {
  return {
    mode,
    tour: 0,
    humeur: 0,
    prixAdverseCourant: prixDepartAdverse,
    cibleSecrete,
    derniereOffreJoueur: null,
    statut: "en_cours",
    message: pickMessage(mode === "achat" ? "ouvertureAchat" : "ouvertureVente"),
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
      message: pickMessage("accord", { prix: offre }),
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
      message: pickMessage("fache"),
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
        message: pickMessage("fache"),
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
      message: pickMessage(refusCle),
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
      message: pickMessage(refusCle),
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
      message: pickMessage("accord", { prix: offre }),
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
    message: pickMessage(contreCle, { prix: nouveauPrix }),
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
    message: pickMessage("relance"),
  };
}
