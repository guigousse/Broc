"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { EtapeBandeau } from "@/components/vente/EtapeBandeau";
import { useGame, useGameActions } from "@/context/GameContext";
import { CoffreChargement } from "@/components/vente/CoffreChargement";
import { CoffrePricing } from "@/components/vente/CoffrePricing";
import { VITRINE_PREP_ID, vitrineEstEnPrep } from "@/lib/vitrinePrep";
import { CATEGORIES } from "@/data/categories";
import { aConnaisseurVitrine } from "@/lib/competences";
import { prixSuggere } from "@/lib/prixSuggere";
import { useLangue } from "@/lib/i18n/LangueContext";
import { traceAPoser, estSurTrace, tracesToutesPosees } from "@/lib/coffreTuto";
import {
  PREFILL_COFFRE_TUTORIEL,
  PRIX_CONSEILLES_TUTORIEL,
  TRACES_TUTORIEL,
} from "@/data/tutorielScenario";
import { tutorielActif } from "@/lib/tutoriel";
import { audioManager } from "@/lib/audio/audioManager";
import type { CategorieObjet, NiveauCamion, ObjetEnVitrine } from "@/types/game";

// Prix par défaut = prix du marché (curseur de tarification centré sur la valeur).
const SUGGESTION_FACTEUR = 1;

// Coffre à traces (tutoriel v3) : la manette (trace 0) n'est plus posée par
// le joueur — démo du grand-père, Task 8. Alias vers `TRACES_TUTORIEL[0]`
// plutôt qu'une chaîne recopiée, pour rester synchronisé avec la source.
const MANETTE_TEMPLATE_ID = TRACES_TUTORIEL[0].templateId;

/**
 * Préparation du coffre AVANT le choix de la brocante : packing puis pricing.
 * À la fin du pricing, on bascule sur l'écran de sélection (/vitrine) — c'est
 * là que la brocante est choisie, payée, et qu'on entre dans la journée.
 *
 * Le coffre est porté par `state.vitrine` avec brocanteId = VITRINE_PREP_ID,
 * ré-attribué à la vraie brocante par BrocantePanorama au clic "Continuer".
 */
export default function VitrinePrepPage() {
  const router = useRouter();
  const {
    state,
    isHydrated,
    ouvrirVitrine,
    mettreEnVitrine,
    retirerDeVitrine,
    ajusterPrixVitrine,
    ajusterPositionVitrine,
    viderVitrine,
    acheterCamion,
    setNiveauCamionDev,
  } = useGame();
  const { avancerTutoriel } = useGameActions();
  const { d } = useLangue();

  const [etape, setEtape] = useState<"packing" | "pricing">("packing");

  // Coffre à traces : latch anti-spam — mémorise le dernier objet aimanté
  // (id + templateId de la trace visée) pour ne pas rejouer le snap/le son
  // à chaque commit throttlé alors que l'objet est déjà exactement posé
  // (le canvas continue d'émettre des onMove/onRotate tout le temps que le
  // doigt reste dans le disque de tolérance). Effacé dès que l'objet sort
  // du disque, pour permettre un nouveau snap+son s'il y retourne plus tard.
  const derniereTraceValideeRef = useRef<{ objetId: string; templateId: string } | null>(
    null,
  );

  // Arrivée dans la prep pendant le tutoriel v2 : la leçon de tarification
  // (« preparer-etal ») est terminée, on bascule directement sur la leçon
  // du coffre à traces (première trace = la manette).
  const tutorielEtape = state?.tutorielEtape;
  useEffect(() => {
    if (tutorielEtape === "preparer-etal") avancerTutoriel("coffre-trace-un");
  }, [tutorielEtape, avancerTutoriel]);

  // Préfill du coffre Tetris (tutoriel v3) : le grand-père a déjà chargé 3
  // pièces du colis — livré à l'étape "ouvrir-colis", donc déjà dans
  // l'inventaire à l'arrivée ici — aux positions scriptées PREFILL_COFFRE_
  // TUTORIEL. Une seule fois (prefillFaitRef), quand la vitrine est ouverte
  // ET encore vide (couvre aussi bien le premier passage que la reprise :
  // si le coffre contient déjà ces objets, `objets.length > 0` court-circuite
  // avant même de consulter le ref). Fail-open si l'inventaire ne contient
  // pas les 3 objets (vieux flux / save antérieure sans colis scripté) :
  // pas de préfill plutôt qu'un crash sur `parTemplate.get(...)!`.
  const prefillFaitRef = useRef(false);
  useEffect(() => {
    if (!state || !tutorielActif(state)) return;
    if (prefillFaitRef.current) return;
    if (!state.vitrine || state.vitrine.objets.length > 0) return;
    const parTemplate = new Map(state.inventaireJoueur.map((o) => [o.templateId, o]));
    const aTousLesObjets = PREFILL_COFFRE_TUTORIEL.every((p) => parTemplate.has(p.templateId));
    if (!aTousLesObjets) return;
    prefillFaitRef.current = true;
    for (const p of PREFILL_COFFRE_TUTORIEL) {
      const obj = parTemplate.get(p.templateId)!;
      mettreEnVitrine(obj.id, p.prixVente, p.posX, p.posY, p.rotation);
    }
  }, [state, mettreEnVitrine]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!state) {
      router.replace("/");
      return;
    }
    // Vitrine déjà attribuée à une vraie brocante → on sort de la prep.
    if (state.vitrine && !vitrineEstEnPrep(state)) {
      router.replace(`/vitrine/${state.vitrine.brocanteId}`);
      return;
    }
    if (!state.vitrine) {
      ouvrirVitrine(VITRINE_PREP_ID);
    }
  }, [isHydrated, state, router, ouvrirVitrine]);

  const coffre: ObjetEnVitrine[] = state?.vitrine?.objets ?? [];
  // Coffre à traces (tutoriel v2) : trace pointillée de l'étape courante —
  // la PREMIÈRE trace exigée par l'étape encore non posée dans le coffre
  // actuel (`traceAPoser`, PAS `traceActive` : ce dernier est une fonction
  // pure de l'étape seule et resterait bloqué sur la trace 2 même si la
  // trace 1 a été délogée depuis — désynchronisé du gate ci-dessous, qui
  // EST cumulatif). `null` hors étapes coffre ou quand tout est posé.
  const trace = tutorielEtape ? traceAPoser(tutorielEtape, coffre) : null;
  const validerBloque = state
    ? !tracesToutesPosees(state.tutorielEtape, coffre)
    : false;
  const stock = useMemo(() => {
    if (!state) return [];
    const ids = new Set(coffre.map((o) => o.objet.id));
    return state.inventaireJoueur.filter(
      (o) => !ids.has(o.id) && !o.enRestauration,
    );
  }, [state, coffre]);

  // Coffre Tetris (tutoriel v3) : ids des objets du préfill effectivement
  // présents dans le coffre — verrouillés (drag/rotation/retrait inertes).
  // Dérivé du coffre courant (pas juste du préfill) : un objet retiré du
  // coffre par un chemin détourné (dev tools, ancienne save) ne resterait
  // pas verrouillé sur un fantôme absent.
  const verrouillesIds = useMemo(() => {
    if (!state || !tutorielActif(state)) return new Set<string>();
    const templates = new Set(PREFILL_COFFRE_TUTORIEL.map((p) => p.templateId));
    return new Set(
      coffre.filter((ov) => templates.has(ov.objet.templateId)).map((ov) => ov.objet.id),
    );
  }, [state, coffre]);

  // Coffre Tetris (tutoriel v3) : pendant les leçons de trace, seul l'objet
  // encore posé À LA MAIN (la carafe) reste ajoutable depuis le carrousel —
  // le reste du stock (rare, colis restant…) reste visible mais inerte tant
  // que la leçon n'est pas terminée. `null` hors ces deux étapes = tout
  // redevient ajoutable.
  //
  // La manette (trace 0) est délibérément EXCLUE, même à `coffre-trace-un` :
  // depuis Task 8 elle n'est plus posée par le joueur mais par la démo du
  // grand-père (`DemoDepotManette`) — la laisser tapable/glissable depuis le
  // carrousel ouvrirait une fenêtre de course (tap avant que le voile
  // plein écran de la démo n'ait fini de se monter) où le joueur pourrait
  // la déposer lui-même, au mauvais prix/à la mauvaise position, et sans
  // jamais faire avancer l'étape (verifierTrace ne le fait plus non plus).
  const ajoutsAutorisesTemplateIds = useMemo(() => {
    if (tutorielEtape !== "coffre-trace-un" && tutorielEtape !== "coffre-trace-deux") {
      return null;
    }
    return new Set(
      TRACES_TUTORIEL.filter((t) => t.templateId !== MANETTE_TEMPLATE_ID).map(
        (t) => t.templateId,
      ),
    );
  }, [tutorielEtape]);

  // Coffre à traces (tutoriel v3) : la démo du grand-père se monte tant que
  // l'étape est `coffre-trace-un` ET que la manette est encore en stock
  // (pas encore posée) — garde de re-jeu après un kill/remontage en plein
  // milieu de la démo : la manette n'a alors jamais quitté l'inventaire
  // (le dépôt réel ne se joue qu'à la toute fin, dans `onTerminee`), donc la
  // démo se remonte et rejoue depuis le début.
  const manetteEnStock = useMemo(
    () => !!state?.inventaireJoueur.some((o) => o.templateId === MANETTE_TEMPLATE_ID),
    [state],
  );
  const demoManette = useMemo(() => {
    if (!state || tutorielEtape !== "coffre-trace-un" || !manetteEnStock) return null;
    return {
      onTerminee: () => {
        const manette = state.inventaireJoueur.find(
          (o) => o.templateId === MANETTE_TEMPLATE_ID,
        );
        if (manette) {
          mettreEnVitrine(
            manette.id,
            PRIX_CONSEILLES_TUTORIEL[MANETTE_TEMPLATE_ID],
            TRACES_TUTORIEL[0].posX,
            TRACES_TUTORIEL[0].posY,
            TRACES_TUTORIEL[0].rotation,
          );
        }
        avancerTutoriel("coffre-trace-deux");
      },
    };
  }, [state, tutorielEtape, manetteEnStock, mettreEnVitrine, avancerTutoriel]);

  const categoriesConnuesVitrine = useMemo(() => {
    const s = new Set<CategorieObjet>();
    if (!state) return s;
    for (const c of CATEGORIES) if (aConnaisseurVitrine(state, c)) s.add(c);
    return s;
  }, [state]);

  if (!isHydrated || !state) {
    return (
      <main
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          fontFamily: "var(--font-mono)",
          color: "var(--ink-500)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontSize: 12,
        }}
      >
        {d.vente.preparationCoffre}
      </main>
    );
  }

  /**
   * Coffre à traces (tutoriel v2) : dès que l'objet visé par la trace
   * affichée (`trace`, dérivée de `traceAPoser` — donc déjà « la bonne »
   * pour l'étape ET l'état actuel du coffre) entre dans les tolérances
   * (position ET angle), il s'aimante exactement sur la trace et fait
   * avancer l'étape (seulement depuis coffre-trace-un : à coffre-trace-deux
   * il n'y a plus d'étape suivante à atteindre ici — la suite se joue dans
   * journee/ClientPage.tsx). `templateId` est fourni par l'appelant plutôt
   * que relu dans `coffre` : `handleAjouter` appelle ceci juste après
   * `mettreEnVitrine`, un setState dont l'effet n'est pas encore visible
   * dans le `coffre` fermé par ce render (le lookup y échouerait toujours,
   * laissant le dépôt direct sur le fantôme — tap OU drag-and-drop depuis le
   * carrousel — sans snap/son/avancement, alors que `tracesToutesPosees`,
   * lui, verrait l'objet dès le prochain render et débloquerait Valider
   * sans que l'étape n'ait avancé).
   *
   * Latch anti-spam (`derniereTraceValideeRef`) : tant que l'objet reste
   * dans le disque de la MÊME trace, on ne réapplique ni le snap ni le son
   * (le canvas commet des onMove/onRotate en continu pendant tout le
   * geste) ; le latch est levé dès que l'objet sort du disque OU que la
   * trace affichée change de templateId, pour rester réarmable.
   *
   * `coffre-trace-un` (la manette) n'avance plus JAMAIS depuis ici : elle
   * n'est plus posée par le joueur (démo du grand-père, Task 8) — seul
   * `coffre-trace-deux` (la carafe) continue de faire avancer l'étape par ce
   * chemin. La branche qui avançait encore `coffre-trace-un` a été retirée,
   * de toute façon inatteignable désormais.
   */
  const verifierTrace = (
    objetId: string,
    templateId: string,
    x: number,
    y: number,
    rot: number,
  ): boolean => {
    if (!trace || templateId !== trace.templateId) {
      if (derniereTraceValideeRef.current?.objetId === objetId) {
        derniereTraceValideeRef.current = null;
      }
      return false;
    }
    if (!estSurTrace({ posX: x, posY: y, rotation: rot }, trace)) {
      if (derniereTraceValideeRef.current?.objetId === objetId) {
        derniereTraceValideeRef.current = null;
      }
      return false;
    }
    const dejaAimante = derniereTraceValideeRef.current?.objetId === objetId;
    if (!dejaAimante) {
      ajusterPositionVitrine(objetId, trace.posX, trace.posY, trace.rotation);
      void audioManager.playCoffreOuvre();
      derniereTraceValideeRef.current = { objetId, templateId: trace.templateId };
    }
    return true;
  };

  const handleAjouter = (objetId: string, posX: number, posY: number) => {
    const obj = state.inventaireJoueur.find((o) => o.id === objetId);
    if (!obj) return;
    const prix = prixSuggere(
      obj,
      categoriesConnuesVitrine.has(obj.categorie),
      SUGGESTION_FACTEUR,
    );
    mettreEnVitrine(objetId, prix, posX, posY, 0);
    // templateId connu via l'inventaire (pas via `coffre`, périmé ici — cf.
    // le commentaire de `verifierTrace`) : couvre le dépôt direct depuis le
    // carrousel (tap au centre OU drag-and-drop lâché pile sur le fantôme).
    verifierTrace(objetId, obj.templateId, posX, posY, 0);
  };

  const handleRotate = (objetId: string, angle: number) => {
    const ov = coffre.find((o) => o.objet.id === objetId);
    if (!ov) return;
    const norm = ((angle % 360) + 360) % 360;
    if (verifierTrace(objetId, ov.objet.templateId, ov.posX ?? 0.5, ov.posY ?? 0.5, norm)) {
      return;
    }
    ajusterPositionVitrine(objetId, ov.posX ?? 0.5, ov.posY ?? 0.5, norm);
  };

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--paper-100)",
      }}
    >
      <MobileHeader budget={state.budget} />
      <EtapeBandeau>
        {etape === "packing"
          ? d.vente.etapePrepCoffre
          : d.vente.etapeTarification}
      </EtapeBandeau>
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          // Étape tarification (liste, pas image) : on décale le contenu sous
          // le texte d'étape flottant. Packing (image) reste à fleur du header.
          paddingTop: etape === "pricing" ? 70 : 0,
        }}
      >
        {etape === "packing" ? (
          <CoffreChargement
            niveauCamion={state.niveauCamion as NiveauCamion}
            budget={state.budget}
            stock={stock}
            coffre={coffre}
            onAjouter={handleAjouter}
            onMove={(id, x, y) => {
              const ov = coffre.find((o) => o.objet.id === id);
              if (!ov) return;
              if (verifierTrace(id, ov.objet.templateId, x, y, ov.rotation ?? 0)) return;
              ajusterPositionVitrine(id, x, y, ov.rotation ?? 0);
            }}
            onRotate={handleRotate}
            onRetirer={retirerDeVitrine}
            onUpgrade={acheterCamion}
            onSetNiveauDev={setNiveauCamionDev}
            onValider={() => setEtape("pricing")}
            onAnnuler={() => {
              viderVitrine();
              router.push("/bureau");
            }}
            tuto={
              state.tutorielEtape === "coffre-trace-un" ||
              state.tutorielEtape === "coffre-trace-deux"
            }
            trace={trace}
            validerBloque={validerBloque}
            // Pendant `coffre-trace-un`, la manette n'est plus posée par le
            // joueur (démo du grand-père) : jamais de main pointant le
            // carrousel à cette étape, même si `trace` y désigne encore la
            // manette — un second appel du regard (la démo ET la main)
            // brouillerait la leçon.
            mainTemplateId={
              tutorielEtape === "coffre-trace-un" ? null : trace?.templateId ?? null
            }
            verrouillesIds={verrouillesIds}
            ajoutsAutorisesTemplateIds={ajoutsAutorisesTemplateIds}
            demoManette={demoManette}
            rotationHint={
              state.tutorielEtape === "coffre-trace-deux" &&
              validerBloque &&
              trace?.templateId === TRACES_TUTORIEL[1].templateId
            }
          />
        ) : (
          <CoffrePricing
            coffre={coffre}
            onAjusterPrix={ajusterPrixVitrine}
            onRetour={() => setEtape("packing")}
            onValider={() => router.push("/vitrine")}
            validerLabel={d.vente.choisirBrocante}
            validerActif={coffre.length > 0}
            categoriesConnues={categoriesConnuesVitrine}
            tutoMainValider={state.tutorielEtape === "coffre-trace-deux"}
          />
        )}
      </main>
    </div>
  );
}
