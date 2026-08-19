"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap } from "lucide-react";
import { useState } from "react";
import type { CSSProperties } from "react";
import { useGame, useGameActions } from "@/context/GameContext";
import { ENERGIE_MAX, energieCourante } from "@/lib/energie";
import { emptyBrocanteur, progressionNiveauBrocanteur } from "@/lib/xp";
import { useBudgetAffiche, useEnergieAffiche, useXpAffiche } from "@/lib/affichageGele";
import { ROUTES_SESSION_PREFIXES } from "@/components/mobile/TabBar";
import { useLangue } from "@/lib/i18n/LangueContext";
import { useEnergieInfinie } from "@/lib/iap/energieInfinie";
import { EnergieRecharge } from "./EnergieRecharge";

interface MobileHeaderProps {
  budget: number;
  /** Solde de jetons du Bazar. Le bloc est masqué tant qu'il vaut 0. */
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
  // la droite (énergie + caisse) déborde — la caisse peut grossir de « 8 € »
  // à « 128 450 € » : le niveau glisse alors du minimum nécessaire plutôt
  // que de pousser la caisse hors de l'écran.
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

const valueStyle: CSSProperties = {
  display: "block",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
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
          {!!jetons && (
            <div style={{ textAlign: "right", flexShrink: 0, ...labelStyle }}>
              {d.chrome.jetons}
              <strong style={valueStyle}>{jetons.toLocaleString(locale)}</strong>
            </div>
          )}
          {/* data-fly-target : cible des objets vendus dans le bilan de vente,
              comme le stockage l'est pour les objets chinés. */}
          <div
            style={{ textAlign: "right", flexShrink: 0, ...labelStyle }}
            data-fly-target="caisse-header"
          >
            {d.chrome.caisse}
            <strong style={valueStyle}>
              {tr(d.chrome.montantEuros, {
                valeur: budgetAffiche.toLocaleString(locale),
              })}
            </strong>
          </div>
        </div>
      </div>

      {rechargeOuverte && <EnergieRecharge onClose={() => setRechargeOuverte(false)} />}
    </header>
  );
}
