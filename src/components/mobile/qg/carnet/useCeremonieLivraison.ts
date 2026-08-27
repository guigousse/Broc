"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CIBLES_VOL, phasesLivraison, type JetonVol } from "@/lib/quetes/ceremonieLivraison";
import { recompenseEffective } from "@/lib/recompenses";
import { energieCourante } from "@/lib/energie";
import { flyToTab } from "@/lib/flyAnimation";
import {
  degelerBudgetAffichage,
  degelerEnergieAffichage,
  degelerJetonsAffichage,
  degelerXpAffichage,
  gelerBudgetAffichage,
  gelerEnergieAffichage,
  gelerJetonsAffichage,
  gelerXpAffichage,
} from "@/lib/affichageGele";
import { audioManager } from "@/lib/audio/audioManager";
import type { Courrier, GameState } from "@/types/game";

/** Fond du clone en vol, au teint du jeton (cf. JETON_STYLES de RecompenseJetons). */
const FONDS_JETON: Record<JetonVol, string> = {
  argent: "radial-gradient(circle at 35% 30%, #b03030, #6e1f1f)",
  xp: "radial-gradient(circle at 35% 30%, #efe3c0, #c8a24a)",
  energie: "radial-gradient(circle at 35% 30%, #4a8a63, #2c5e3f)",
  // Le bleu de la devise, sur la nuit du Bazar : c'est lui qui distingue une
  // pièce d'un billet quand les deux tombent dans la même caisse.
  bazar: "radial-gradient(circle at 35% 30%, var(--azur-400), var(--midnight-800))",
};

/** Durée du fondu de retrait de la carte livrée, en ms. */
const FONDU_SORTIE_MS = 300;

interface UseCeremonieLivraisonArgs {
  state: GameState;
  onLivrerMission: (courrierId: string) => { ok: boolean; raison?: string };
  /** Temps de confiance (epoch ms) ; `Date.now()` à défaut. */
  tempsConfiance?: () => number | null;
  /** Appelé à la toute fin de la cérémonie (après le fondu), uniquement si la
   *  mission livrée était de catégorie `principale` — point d'accroche de
   *  l'enchaînement du grand-père. Pas encore branché. */
  onChapitreLivre?: (courrierId: string) => void;
}

/**
 * Cérémonie de livraison — déclenchée UNIQUEMENT par le tap sur « Livrer »,
 * jamais depuis un effet (StrictMode monterait deux fois et enverrait les
 * jetons en double).
 *
 * L'ordre est : capture des valeurs d'AVANT → livraison réelle (le state est
 * crédité tout de suite, rien n'est perdu si l'app meurt) → gel de
 * l'affichage des trois compteurs → frise de vols, chaque atterrissage
 * dégelant son compteur → retrait de la carte en fondu.
 */
export function useCeremonieLivraison({
  state,
  onLivrerMission,
  tempsConfiance,
  onChapitreLivre,
}: UseCeremonieLivraisonArgs) {
  /** Commande dont la cérémonie de livraison est en cours (carte maintenue). */
  const [ceremonieId, setCeremonieId] = useState<string | null>(null);
  /** Timers de la cérémonie en cours (annulés au démontage). */
  const timersRef = useRef<number[]>([]);
  const byId = useMemo(() => new Map(state.courriers.map((c: Courrier) => [c.id, c])), [state.courriers]);

  // Démontage (carnet refermé) en pleine cérémonie : couper les timers et
  // rendre leurs vraies valeurs aux compteurs du header, sinon ils resteraient
  // figés pour toute la partie.
  useEffect(
    () => () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
      degelerXpAffichage();
      degelerBudgetAffichage();
      degelerEnergieAffichage();
      degelerJetonsAffichage();
    },
    [],
  );

  const lancer = (courrierId: string) => {
    const courrier = byId.get(courrierId);
    if (!courrier || courrier.payload.type !== "mission" || ceremonieId) return;
    const rEff = recompenseEffective(courrier.payload, {
      state,
      reso: state.missions.find((m) => m.courrierId === courrierId) ?? {},
      jourRecu: courrier.jourRecu,
    });
    const maintenant = tempsConfiance?.() ?? Date.now();
    const avant = {
      brocanteur: state.brocanteur,
      budget: state.budget,
      energie: energieCourante(state, maintenant),
      jetons: state.jetons ?? 0,
    };
    const res = onLivrerMission(courrierId);
    if (!res.ok) return;
    // On ne gèle QUE les compteurs dont le jeton va voler : `phasesLivraison`
    // n'émet d'atterrissage — donc de dégel — que pour les gains non nuls, et un
    // gain nul est le cas courant (aucune quête ne donne d'énergie aujourd'hui,
    // et `argent: 0` est légal). Geler sans dégel prévu figerait le compteur
    // pour toute la partie.
    if (rEff.xp > 0) gelerXpAffichage(avant.brocanteur);
    if (rEff.argent > 0) gelerBudgetAffichage(avant.budget);
    if (rEff.energie > 0) gelerEnergieAffichage(avant.energie);
    if (rEff.jetons > 0) gelerJetonsAffichage(avant.jetons);
    setCeremonieId(courrierId);

    // Les timers de la cérémonie précédente ont tous tiré (le garde-fou
    // `ceremonieId` interdit le chevauchement) : la liste peut repartir à vide.
    timersRef.current = [];
    const racine = document.querySelector(`[data-commande-id="${courrierId}"]`);
    for (const { at, etape } of phasesLivraison(rEff)) {
      const t = window.setTimeout(() => {
        if (etape.type === "envol") {
          // Carte dépliée = DEUX bandeaux de récompense, donc deux jumeaux par
          // jeton : masquer les deux, sinon le jeton du détail reste visible
          // pendant que son clone s'envole.
          const jumeaux = racine
            ? Array.from(racine.querySelectorAll<HTMLElement>(`[data-jeton="${etape.jeton}"]`))
            : [];
          for (const j of jumeaux) j.style.visibility = "hidden";
          const jeton = jumeaux[0] ?? null;
          flyToTab({
            fromRect: (jeton ?? racine ?? document.body).getBoundingClientRect(),
            imageUrl: null,
            fallbackBg: FONDS_JETON[etape.jeton],
            borderColor: etape.jeton === "bazar" ? "var(--azur-400)" : "#c8a24a",
            targetSelector: CIBLES_VOL[etape.jeton],
            // Les Bazarcoins ont leur propre tintement, joué à l'atterrissage
            // (ci-dessous) : le petit son d'ajout le doublerait.
            playSound: etape.jeton !== "bazar",
          });
        } else if (etape.type === "atterrissage") {
          if (etape.jeton === "xp") degelerXpAffichage();
          else if (etape.jeton === "energie") degelerEnergieAffichage();
          else if (etape.jeton === "bazar") {
            degelerJetonsAffichage();
            // Le tintement se joue ICI et non à l'arrivée du clone : la frise
            // est la seule horloge de la cérémonie, et l'atterrissage y tombe
            // au même instant. Deux horloges à accorder à la main finissent
            // toujours par diverger.
            void audioManager.playJetonBazar();
          } else degelerBudgetAffichage();
        } else {
          // Filet : quoi qu'il arrive, aucun compteur ne reste gelé après la
          // cérémonie (les dégels sont idempotents et sans effet si rien n'est
          // gelé). Double ceinture avec le gel conditionnel ci-dessus.
          degelerXpAffichage();
          degelerBudgetAffichage();
          degelerEnergieAffichage();
          degelerJetonsAffichage();
          // La carte se fond / se rétracte avant de quitter la liste.
          const el = document.querySelector<HTMLElement>(`[data-commande-id="${courrierId}"]`);
          if (el) {
            el.style.transition = `opacity ${FONDU_SORTIE_MS}ms ease, max-height ${FONDU_SORTIE_MS}ms ease`;
            el.style.overflow = "hidden";
            el.style.maxHeight = `${el.offsetHeight}px`;
            requestAnimationFrame(() => {
              el.style.opacity = "0";
              el.style.maxHeight = "0";
            });
          }
          const tFin = window.setTimeout(() => {
            setCeremonieId(null);
            const livree = byId.get(courrierId);
            if (livree?.payload.type === "mission" && livree.payload.categorie === "principale") {
              onChapitreLivre?.(courrierId);
            }
          }, FONDU_SORTIE_MS + 20);
          timersRef.current.push(tFin);
        }
      }, at);
      timersRef.current.push(t);
    }
  };

  return { ceremonieId, lancer };
}
