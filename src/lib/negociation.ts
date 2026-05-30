import type {
  NegoMode,
  NegoPersona,
  NegociationState,
} from "@/types/game";

const MESSAGES_CONTRE_OFFRE_VENDEUR = [
  "« Bon, allez, je vous fais un petit geste… »",
  "« Hmm. Disons {prix} €. »",
  "« {prix} € et on en parle plus. »",
  "« Je peux descendre à {prix} €, c'est mon mieux. »",
];

const MESSAGES_CONTRE_OFFRE_CLIENT = [
  "« Je peux monter un peu : {prix} €. »",
  "« {prix} €, et c'est ma proposition honnête. »",
  "« Bon, allez, {prix} € si vous me l'enveloppez. »",
];

const MESSAGES_REFUS_POLI_VENDEUR = [
  "« Bon, je vais ranger. Mais c'est dommage. »",
  "« Tant pis, à une prochaine fois. »",
];

const MESSAGES_REFUS_POLI_CLIENT = [
  "« Tant pis, je vais voir ailleurs. »",
  "« Je passerai mon tour, merci. »",
];

const MESSAGES_FACHE = [
  "« Vous vous moquez de moi ! »",
  "« Vous abusez de ma patience. »",
];

const MESSAGES_ACCORD = [
  "Marché conclu à {prix} €.",
  "Vendu à {prix} €.",
];

function pickMessage(list: readonly string[], prix?: number): string {
  const msg = list[Math.floor(Math.random() * list.length)];
  return prix !== undefined ? msg.replace("{prix}", String(prix)) : msg;
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
    message:
      mode === "achat"
        ? "Faites glisser votre curseur pour proposer un prix."
        : "Le client vous a fait une offre. À vous de répondre.",
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
  if (mode === "achat") {
    return Math.round(
      Math.max(cible, prixCourant - (prixCourant - cible) * elanPct),
    );
  }
  return Math.round(
    Math.min(cible, prixCourant + (cible - prixCourant) * elanPct),
  );
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
  const humeurBase = Math.min(1, pressionTour);

  // 1. Accord
  if (offreRejoint(nego.mode, offre, nego.prixAdverseCourant)) {
    return {
      ...nego,
      tour,
      humeur: humeurBase,
      derniereOffreJoueur: offre,
      statut: "conclu",
      message: pickMessage(MESSAGES_ACCORD, offre),
    };
  }

  // 2. Colère franche (offre insultante)
  if (offreInsultante(nego.mode, offre, nego.prixAdverseCourant, persona.tolerancePct)) {
    return {
      ...nego,
      tour,
      humeur: 1,
      derniereOffreJoueur: offre,
      statut: "fache",
      message: pickMessage(MESSAGES_FACHE),
    };
  }

  // 3. Colère prématurée aléatoire
  const chanceColere = Math.max(0, (1 - persona.sangFroid) * pressionTour * 0.5);
  if (Math.random() < chanceColere) {
    return {
      ...nego,
      tour,
      humeur: 1,
      derniereOffreJoueur: offre,
      statut: "fache",
      message: pickMessage(MESSAGES_FACHE),
    };
  }

  // 4. Refus poli (patience dépassée)
  if (tour >= persona.patience) {
    const refusMsgs =
      nego.mode === "achat" ? MESSAGES_REFUS_POLI_VENDEUR : MESSAGES_REFUS_POLI_CLIENT;
    return {
      ...nego,
      tour,
      humeur: Math.max(humeurBase, 0.8),
      derniereOffreJoueur: offre,
      statut: "refus_poli",
      message: pickMessage(refusMsgs),
    };
  }

  // 5. Contre-offre
  const nouveauPrix = adversePushVers(
    nego.mode,
    nego.prixAdverseCourant,
    nego.cibleSecrete,
    persona.elanPct,
  );
  const contreMsgs =
    nego.mode === "achat" ? MESSAGES_CONTRE_OFFRE_VENDEUR : MESSAGES_CONTRE_OFFRE_CLIENT;
  return {
    ...nego,
    tour,
    humeur: humeurBase,
    prixAdverseCourant: nouveauPrix,
    derniereOffreJoueur: offre,
    statut: "en_cours",
    message: pickMessage(contreMsgs, nouveauPrix),
  };
}
