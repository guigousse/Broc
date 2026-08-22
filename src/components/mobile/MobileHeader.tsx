"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap } from "lucide-react";
import { BazarcoinIcon } from "@/components/ui/BazarcoinIcon";
import { useState } from "react";
import type { CSSProperties } from "react";
import { useGame, useGameActions } from "@/context/GameContext";
import { ENERGIE_MAX, energieCourante } from "@/lib/energie";
import { emptyBrocanteur, progressionNiveauBrocanteur } from "@/lib/xp";
import { useBudgetAffiche, useEnergieAffiche, useXpAffiche } from "@/lib/affichageGele";
import { formaterMontantCompact } from "@/lib/montantCompact";
import { ROUTES_SESSION_PREFIXES } from "@/components/mobile/TabBar";
import { useLangue } from "@/lib/i18n/LangueContext";
import { useEnergieInfinie } from "@/lib/iap/energieInfinie";
import { EnergieRecharge } from "./EnergieRecharge";

interface MobileHeaderProps {
  budget: number;
  /**
   * Solde en Bazarcoins. TOUJOURS affiché, même à zéro.
   *
   * Il était masqué à zéro tant qu'il vivait dans son propre bloc, et l'écran
   * du Bazar le forçait par une prop. Depuis que la caisse porte les deux
   * devises sous un seul libellé, en escamoter une fait sauter le centrage du
   * mot d'un écran à l'autre — et une bourse à zéro est une information : elle
   * dit au joueur qu'il lui faut aller en gagner.
   */
  jetons?: number;
}

const wrapStyle: CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 30,
  paddingTop: "var(--safe-top)",
  background: "var(--forest-800)",
  borderBottom: "3px solid var(--brass-500)",
};

const innerStyle: CSSProperties = {
  display: "grid",
  // Colonnes latérales de même flexibilité : le bloc NIVEAU, seul au milieu,
  // tombe donc au centre de la page. Elles ne s'écartent de l'égalité que si
  // la droite (énergie + caisse) déborde. La caisse est bornée depuis
  // qu'elle abrège (« 128,4k € » et non « 128 450 € »), mais le niveau garde
  // ce droit de glisser plutôt que de la pousser hors de l'écran.
  gridTemplateColumns: "1fr auto 1fr",
  alignItems: "center",
  gap: 10,
  padding: "8px 14px",
  height: "var(--mobile-header-h)",
  boxSizing: "border-box",
};

/** Énergie + caisse. L'énergie occupe tout le reste et s'y centre : elle est
 *  donc à mi-chemin du bloc niveau et de la caisse, elle-même en bout de
 *  ligne. */
const droiteStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const labelStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "clamp(8px, 2.2vw, 10px)",
  fontWeight: 700,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  // brass-300 (7,6:1 sur forest-800) — brass-700 mesurait 2,7:1, sous AA.
  color: "var(--brass-300)",
  lineHeight: 1,
};

/**
 * Hors de vue, mais dans l'arbre d'accessibilité. Même clip-rect que
 * `ChineNegoDrawer` — le dépôt n'a pas d'idiome « sr-only » partagé.
 */
const srOnlyStyle: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

/**
 * Hauteur du signe Ƶ, en em du corps qui l'entoure : l'œil du « € » et des
 * chiffres. MESURÉE au canvas et non estimée — 10,85 px d'encre pour 14,93 px
 * de corps sur Cinzel, soit 0,727 ; le « 8 » y mesure 10,87, la même chose.
 *
 * En em et non en pixels parce que le corps de la caisse est fluide
 * (`clamp(13px, 3.8vw, 16px)`) : figé, le signe dépasserait le « € » sur un
 * petit écran et lui serait plus court sur un grand.
 */
const HAUTEUR_SIGNE = "0.73em";

/**
 * L'écart entre un montant et son signe. Deux valeurs pour UN SEUL écart vu :
 * le Ƶ est un SVG, qui n'a pas d'approche, tandis que le « € » est un
 * caractère qui en a une, et que la ligne porte une interlettre de 0,18 em.
 * À `gap` égal, l'encre ne l'est pas.
 *
 * Réglé sur captures ×8, cinq cas (trois montants, trois gabarits) : 3 px
 * côté Bazarcoin et 4 px côté euros laissent moins d'un pixel d'écart entre
 * les deux blancs. Le reste tient aux approches des chiffres eux-mêmes — un
 * « 7 » ne se termine pas là où se termine un « 0 » — et aucun réglage ne
 * l'égalise pour tous les montants à la fois.
 */
const ECART_SIGNE = 3;
const ECART_SIGNE_TEXTE = 4;

/**
 * Découpe un gabarit `"{valeur} €"` en morceaux autour de sa variable, en
 * rendant `null` à sa place et en laissant tomber les espaces qui la
 * bordaient. Les quatre langues suffixent aujourd'hui le signe, mais une
 * langue qui le préfixerait passe par le même chemin.
 */
function decouperGabarit(gabarit: string): (string | null)[] {
  return gabarit
    .split("{valeur}")
    .flatMap((part, i) => (i === 0 ? [part] : [null, part]))
    .map((part) => (part === null ? null : part.trim()))
    .filter((part) => part !== "");
}

const valueStyle: CSSProperties = {
  display: "block",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  // Le bloc caisse hérite du `uppercase` de son libellé : sans ce contre-ordre,
  // la forme courte s'affiche « 10,6K ». La minuscule est voulue — après un
  // chiffre en police d'affichage, une capitale fait une seconde hampe qui se
  // lit comme un caractère de plus.
  textTransform: "none",
  fontSize: "clamp(13px, 3.8vw, 16px)",
  color: "var(--brass-300)",
  marginTop: 2,
  // Une caisse à quatre chiffres ne doit jamais casser en deux lignes : c'est
  // l'énergie (flex: 1) qui cède de la place, pas le montant.
  whiteSpace: "nowrap",
};

const xpBlocStyle: CSSProperties = {
  ...labelStyle,
  display: "block",
  textAlign: "center",
  justifySelf: "center",
  minWidth: 0,
  textDecoration: "none",
};

/** Ligne « 3 ▮▮▮▯▯ » sous le libellé NIVEAU. */
const xpLigneStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  marginTop: 2,
};

/** Même police et même taille que l'énergie et la caisse (valueStyle). */
const xpNiveauStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: "clamp(13px, 3.8vw, 16px)",
  color: "var(--brass-300)",
  lineHeight: 1,
};

const xpTrackStyle: CSSProperties = {
  width: 56,
  height: 5,
  background: "rgba(247,244,238,0.18)",
  border: "1px solid var(--brass-500)",
  overflow: "hidden",
};

const xpFillStyle: CSSProperties = {
  display: "block",
  height: "100%",
  background: "var(--brass-500)",
  transition: "width 300ms ease",
};

/** Repli quand aucune partie n'est chargée : le hook doit être appelé
 *  inconditionnellement, il lui faut donc toujours une valeur. */
const BROCANTEUR_REPLI = emptyBrocanteur();

export function MobileHeader({ budget, jetons }: MobileHeaderProps) {
  const { state } = useGame();
  const { tempsConfiance } = useGameActions();
  const [rechargeOuverte, setRechargeOuverte] = useState(false);
  const pathname = usePathname();
  const { d, tr, locale } = useLangue();
  // Achat IAP « Énergie infinie » — drapeau device : la jauge affiche ∞ et
  // ignore les couleurs d'alerte basse (toujours au max en mode infini).
  const energieInfinie = useEnergieInfinie();

  // Pendant une session, la barre est figée sur un instantané : elle ne
  // progresse qu'à la cérémonie de bilan (envol de la pastille XP).
  const brocanteurAffiche = useXpAffiche(state?.brocanteur ?? BROCANTEUR_REPLI);
  // Idem pour la caisse pendant une journée de vente : elle n'encaisse qu'au
  // bilan, quand chaque prix de vente vient s'y poser.
  const budgetAffiche = useBudgetAffiche(budget);

  const energieMax = ENERGIE_MAX;
  const energie = state
    ? energieCourante(state, tempsConfiance() ?? Date.now(), energieMax)
    : ENERGIE_MAX;
  // Affichage figé pendant la cérémonie de livraison (jeton ⚡ en vol) ; le
  // droit de recharger reste calculé sur la vraie énergie, jamais l'affichage.
  const energieAffichee = useEnergieAffiche(energie);

  // Codage couleur de la jauge : plein → tout en laiton clair ; entamé → le
  // numérateur seul s'assombrit (laiton 500, 5,5:1 : brass-700 tomberait à
  // 2,7:1, sous AA) ; à sec → « 0/5 » et l'éclair passent au rouge.
  const aSec = energieAffichee <= 0;
  const couleurReste = aSec ? "var(--red-signal-300)" : "var(--brass-300)";
  const couleurEnergie = aSec
    ? "var(--red-signal-300)"
    : energieAffichee >= energieMax
      ? "var(--brass-300)"
      : "var(--brass-500)";

  // La puce XP ne doit pas naviguer pendant une session (chinage/vitrine) : un
  // mistap ferait sortir de la session et re-paierait le droit d'entrée +
  // re-consommerait l'énergie à la re-entrée. Elle ne doit pas non plus
  // naviguer avant N1, car l'écran Compétences est masqué tant que le joueur
  // n'a pas ouvert son premier point.
  const enSession = ROUTES_SESSION_PREFIXES.some((p) => pathname?.startsWith(p));
  const xpNavigationBloquee = enSession || (state ? state.brocanteur.niveau < 1 : true);
  const xpLabel = state
    ? tr(d.chrome.niveauBrocanteur, { n: brocanteurAffiche.niveau })
    : undefined;
  const xpContenu = state ? (
    <>
      {d.chrome.niveau}
      <span style={xpLigneStyle}>
        <span style={xpNiveauStyle}>{brocanteurAffiche.niveau}</span>
        <span style={xpTrackStyle}>
          <span
            style={{
              ...xpFillStyle,
              width: `${Math.round(progressionNiveauBrocanteur(brocanteurAffiche) * 100)}%`,
            }}
          />
        </span>
      </span>
    </>
  ) : null;

  return (
    <header style={wrapStyle}>
      <div style={innerStyle}>
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-broc-title)",
            fontWeight: 400,
            fontSize: "clamp(26px, 7.8vw, 36px)",
            letterSpacing: "0.04em",
            color: "var(--brass-300)",
            textDecoration: "none",
            lineHeight: 1,
            display: "inline-flex",
            alignItems: "center",
            height: "100%",
          }}
        >
          Broc
        </Link>
        {state ? (
          xpNavigationBloquee ? (
            <span style={xpBlocStyle} aria-label={xpLabel} data-fly-target="xp-header">
              {xpContenu}
            </span>
          ) : (
            <Link href="/bibliotheque" style={xpBlocStyle} aria-label={xpLabel} data-fly-target="xp-header">
              {xpContenu}
            </Link>
          )
        ) : (
          <span />
        )}
        <div style={droiteStyle}>
          {/* Plus de bouton « + » séparé : le bloc énergie entier ouvre la
              recharge, plein ou non (elle sait dire « énergie au maximum »). */}
          <button
            type="button"
            onClick={() => setRechargeOuverte(true)}
            aria-label={d.chrome.rechargerEnergie}
            style={{
              ...labelStyle,
              flex: 1,
              textAlign: "center",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              // Marges négatives compensées : la cible tactile déborde du
              // texte sans décaler la grille.
              padding: "8px 10px",
              margin: "-8px 0",
            }}
          >
            {d.chrome.energie}
            <strong
              style={{
                ...valueStyle,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
              data-fly-target="energie-header"
            >
              {energieInfinie ? (
                <span style={{ color: couleurReste }} aria-label={d.chrome.energieInfinie}>
                  ∞
                </span>
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center" }}>
                  <span style={{ color: couleurEnergie }}>{energieAffichee}</span>
                  <span style={{ color: couleurReste }}>/{energieMax}</span>
                </span>
              )}
              <Zap size={15} strokeWidth={2.5} color={couleurReste} aria-hidden />
            </strong>
          </button>
          {/* LA CAISSE, en deux devises sous UN SEUL libellé — c'est une
              bourse, pas deux compteurs voisins. Le libellé se centre donc
              sur l'ensemble.

              La couleur est ce qui les sépare : le Bazarcoin en bleu
              électrique, les euros en laiton comme partout ailleurs dans le
              jeu. Sans elle, deux nombres voisins sous un même mot seraient
              illisibles. */}
          <div
            data-caisse
            style={{ flexShrink: 0, textAlign: "center", ...labelStyle }}
          >
            {d.chrome.caisse}
            <span
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "center",
                gap: 9,
              }}
            >
              <strong
                  style={{
                    ...valueStyle,
                    display: "inline-flex",
                    // Sur la LIGNE DE BASE du nombre, pas au centre de la
                    // ligne : centré, le signe tombait 1,6 px plus bas que le
                    // « € » voisin, mesuré sur une capture ×8. En alignement
                    // par ligne de base, le bord bas du SVG s'y pose — et
                    // c'est là que s'arrête aussi l'encre des chiffres.
                    alignItems: "baseline",
                    gap: ECART_SIGNE,
                    color: "var(--azur-400)",
                  }}
                >
                  {/* Le mot ET le compte exact restent dans le DOM, hors de
                      vue : un lecteur d'écran entend « Caisse, Bazarcoins
                      12 500, 10 610 € », là où l'œil lit un signe et une
                      forme courte. L'abréviation est une commodité pour
                      l'œil ; le montant, lui, reste dû. */}
                  <span style={srOnlyStyle}>
                    {`${d.chrome.jetons} ${(jetons ?? 0).toLocaleString(locale)}`}
                  </span>
                  <span aria-hidden="true">
                    {formaterMontantCompact(jetons ?? 0, locale)}
                  </span>
                  <BazarcoinIcon size={HAUTEUR_SIGNE} />
                </strong>
              {/* data-fly-target : cible des objets vendus dans le bilan de
                  vente, comme le stockage l'est pour les objets chinés. Il est
                  posé sur le MONTANT EN EUROS et non sur le bloc entier :
                  depuis que la caisse porte deux devises, le centre du bloc
                  tombe entre les deux nombres, et l'argent volerait à côté de
                  la somme qu'il vient grossir. */}
              <strong style={{ ...valueStyle, display: "inline-flex" }} data-fly-target="caisse-header">
                <span style={srOnlyStyle}>
                  {tr(d.chrome.montantEuros, {
                    valeur: budgetAffiche.toLocaleString(locale),
                  })}
                </span>
                {/* Le gabarit de traduction porte une espace littérale entre
                    le nombre et le « € ». Elle est plus large que l'écart du
                    Bazarcoin voisin et échappe à tout réglage : on découpe
                    donc le gabarit autour de sa variable et c'est le `gap` qui
                    tient l'écart, identique des deux côtés. */}
                <span
                  aria-hidden="true"
                  style={{ display: "inline-flex", alignItems: "baseline", gap: ECART_SIGNE_TEXTE }}
                >
                  {decouperGabarit(d.chrome.montantEuros).map((part, i) =>
                    part === null ? (
                      <span key={i}>{formaterMontantCompact(budgetAffiche, locale)}</span>
                    ) : (
                      <span key={i}>{part}</span>
                    ),
                  )}
                </span>
              </strong>
            </span>
        </div>
        </div>
      </div>

      {rechargeOuverte && <EnergieRecharge onClose={() => setRechargeOuverte(false)} />}
    </header>
  );
}
