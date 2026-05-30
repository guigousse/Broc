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
      message: pickMessage(MESSAGES_ACCORD, offre),
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
      message: pickMessage(MESSAGES_FACHE),
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
        message: pickMessage(MESSAGES_FACHE),
      };
    }
    const refusMsgs =
      nego.mode === "achat" ? MESSAGES_REFUS_POLI_VENDEUR : MESSAGES_REFUS_POLI_CLIENT;
    return {
      ...nego,
      tour,
      humeur,
      derniereOffreJoueur: offre,
      statut: "refus_poli",
      message: pickMessage(refusMsgs),
    };
  }

  // 4. Refus poli (patience épuisée)
  if (tour >= persona.patience) {
    const refusMsgs =
      nego.mode === "achat" ? MESSAGES_REFUS_POLI_VENDEUR : MESSAGES_REFUS_POLI_CLIENT;
    return {
      ...nego,
      tour,
      humeur: Math.max(humeur, 0.8),
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
      message: pickMessage(MESSAGES_ACCORD, offre),
    };
  }

  const contreMsgs =
    nego.mode === "achat" ? MESSAGES_CONTRE_OFFRE_VENDEUR : MESSAGES_CONTRE_OFFRE_CLIENT;
  return {
    ...nego,
    tour,
    humeur,
    prixAdverseCourant: nouveauPrix,
    derniereOffreJoueur: offre,
    statut: "en_cours",
    message: pickMessage(contreMsgs, nouveauPrix),
  };
}
