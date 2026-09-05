"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { FloatingRoomOverlay } from "@/components/mobile/floating-room/FloatingRoomOverlay";
import { PageHeaderBar } from "@/components/mobile/PageHeaderBar";
import { TreePicker } from "@/components/mobile/TreePicker";
import { TutorielCoach } from "@/components/mobile/tutoriel/TutorielCoach";
import { DialogueOverlay } from "@/components/mobile/dialogue/DialogueOverlay";
import { useToast } from "@/components/ui/Toast";
import { BazarcoinIcon } from "@/components/ui/BazarcoinIcon";
import { useGame, useGameActions } from "@/context/GameContext";
import { CATEGORIES } from "@/data/categories";
import {
  COMPETENCES,
  TREE_GENERAL,
  catTreeId,
  competencesParTree,
  getTreeDef,
  getTreeMeta,
  competencesParBranche,
  visuelCompetence,
} from "@/data/competences";
import { GRAND_PERE_PORTRAITS, SEQUENCES_TUTORIEL } from "@/data/dialogues";
import { contexteDepuisState, etatCompetence } from "@/lib/competences";
import {
  auPlafondNiveau,
  detailProgressionBrocanteur,
  progressionNiveauBrocanteur,
} from "@/lib/xp";
import { prochainDeblocage } from "@/data/deblocagesNiveau";
import { ParcoursSheet } from "@/components/mobile/ParcoursSheet";
import { useLangue } from "@/lib/i18n/LangueContext";
import { competenceGuidee } from "@/lib/tutoriel";
import {
  descriptionBranche,
  descriptionCompetence,
  nomArbre,
  nomBranche,
  nomCompetence,
  nomExpediteur,
  titreDeblocage,
} from "@/lib/i18n/contenu";
import type {
  CompetenceDef,
  CompetenceId,
  CompetenceTreeId,
} from "@/types/game";

/**
 * Machine locale de la leçon « visite guidée des compétences » (étapes
 * `competences-visite` puis `competences-choix`) : coach 3 bulles, main sur
 * la branche Présentation, tap du bon palier, achat, dialogue de clôture.
 * Remontage en cours de leçon = repart à "coach" (fail-open, cf. collection).
 */
type PhaseLecon = "coach" | "branche" | "palier" | "dialogue";

export default function CompetencesPage() {
  const { state, isHydrated, debloquerCompetence } = useGame();
  const { avancerTutoriel } = useGameActions();
  const { toast } = useToast();
  const { d, tr, locale } = useLangue();
  const [tree, setTree] = useState<CompetenceTreeId>(TREE_GENERAL);
  const [palierActif, setPalierActif] = useState<CompetenceDef | null>(null);
  const [parcoursOuvert, setParcoursOuvert] = useState(false);
  const etapeTuto = state?.tutorielEtape;
  const guide = etapeTuto ? competenceGuidee(etapeTuto) : null;
  const enLecon = etapeTuto === "competences-visite" || etapeTuto === "competences-choix";
  const [phaseLecon, setPhaseLecon] = useState<PhaseLecon>("coach");

  /* La branche « Présentation » est bien plus bas que le pli de l'écran : le
     joueur arrivait sur la visite guidée sans rien voir de ce qu'on lui
     demandait, et la main pointeuse le désignait hors champ (recette device
     2026-08-19). Dès que la leçon passe à la phase « branche », le panneau
     défile jusqu'à elle — comme la collection le fait déjà pour la peluche. */
  const brancheGuideeRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (phaseLecon !== "branche") return;
    const el = brancheGuideeRef.current;
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [phaseLecon]);

  // When user switches tree, close any open detail sheet
  useEffect(() => {
    setPalierActif(null);
  }, [tree]);

  // Le layout (qg) gate le rendu (redirect + écran d'attente) : ce garde
  // ne sert qu'au narrowing TypeScript.
  if (!isHydrated || !state) return null;

  const meta = getTreeMeta(tree);
  const treeDef = getTreeDef(tree);
  const xpProgress = progressionNiveauBrocanteur(state.brocanteur);
  const auPlafond = auPlafondNiveau(state.brocanteur);
  const prochain = prochainDeblocage(state.brocanteur.niveau);
  const { dansNiveau, requisNiveau } = detailProgressionBrocanteur(
    state.brocanteur,
  );

  const allTreeIds: CompetenceTreeId[] = [
    TREE_GENERAL,
    ...CATEGORIES.map((c) => catTreeId(c)),
  ];
  const nbDebloqueesParTree = Object.fromEntries(
    allTreeIds.map((id) => [
      id,
      competencesParTree(id).filter((c) =>
        state.competencesDebloquees.includes(c.id),
      ).length,
    ]),
  ) as Record<CompetenceTreeId, number>;

  return (
    <>
      <FloatingRoomOverlay
        bande={
          <>
            <PageHeaderBar title={d.bibliotheque.titre} />
            <div data-tuto-coach="competences-arbres" style={{ marginTop: 4 }}>
              <TreePicker
                nbDebloqueesParTree={nbDebloqueesParTree}
                selectionne={tree}
                onSelect={setTree}
              />
            </div>
          </>
        }
        milieu={
          /* Bloc indépendant entre bande et panneau : carte propre (le
             milieu du châssis est un bloc libre sans habillage). */
          <div
            style={{
              border: "1px solid var(--brass-500)",
              borderRadius: "var(--radius-card)",
              boxShadow:
                "0 16px 32px rgba(0,0,0,0.38), inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
              background: "var(--paper-100)",
              padding: "8px 10px 10px",
            }}
          >
            <div
              data-tuto-coach="competences-xp"
              style={{
                marginTop: 8,
                border: "1px solid var(--brass-500)",
                background: "var(--paper-100)",
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                gap: 12,

              }}
            >
              <div style={{ fontFamily: "var(--font-display)", fontSize: 16 }}>
                {tr(d.bibliotheque.niveauAbrege, { n: state.brocanteur.niveau })}
              </div>
              {/* Barre épaisse avec « x / y XP » incrusté au centre. Le
                  texte chevauche remplissage laiton ET fond papier : encre
                  sombre + halo papier pour rester lisible sur les deux. */}
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  position: "relative",
                  height: 18,
                  background: "var(--paper-300)",
                  border: "1px solid var(--brass-500)",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    background: "var(--brass-700)",
                    width: auPlafond ? "100%" : `${Math.round(xpProgress * 100)}%`,
                  }}
                />
                {/* Niveau 100 : le laiton reste plein et la progression vers
                    le prochain Bazarcoin de prestige (1 Ƶ / 500 XP) se
                    superpose en bleu, la couleur de la monnaie du Bazar. */}
                {auPlafond ? (
                  <div
                    data-testid="xp-prestige"
                    style={{
                      position: "absolute",
                      inset: 0,
                      right: "auto",
                      background: "var(--azur-600)",
                      width: `${Math.round(xpProgress * 100)}%`,
                    }}
                  />
                ) : null}
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "grid",
                    placeItems: "center",
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    color: "var(--forest-800)",
                    textShadow:
                      "0 0 3px var(--paper-100), 0 0 5px var(--paper-100)",
                    pointerEvents: "none",
                  }}
                >
                  {/* Au plafond, le détail compte vers le prochain Bazarcoin
                      (x / 500 XP) : le signe Ƶ dit ce que la barre bleue
                      prépare. */}
                  {tr(d.bibliotheque.xpProgression, {
                    dansNiveau: dansNiveau.toLocaleString(locale),
                    requisNiveau: requisNiveau.toLocaleString(locale),
                  })}
                  {auPlafond ? (
                    <>
                      {"\u00a0→\u00a0"}
                      <BazarcoinIcon size={10} surClair />
                    </>
                  ) : null}
                </span>
              </div>
              <div
                data-tuto-coach="competences-point"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 14,
                  color:
                    state.brocanteur.pointsDisponibles > 0
                      ? "var(--vermillion-600)"
                      : "var(--ink-500)",
                  textAlign: "center",
                }}
              >
                {state.brocanteur.pointsDisponibles}
                <span
                  style={{
                    display: "block",
                    fontFamily: "var(--font-mono)",
                    fontSize: 8.5,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "var(--brass-700)",
                  }}
                >
                  {d.bibliotheque.ptsCaption}
                </span>
              </div>
            </div>
            {/* Prochain palier : bannière cliquable (reste visible même sans
                prochain déblocage — le Parcours sert aussi de récapitulatif). */}
            <button
              type="button"
              onClick={() => setParcoursOuvert(true)}
              aria-label={d.bibliotheque.voirParcoursAria}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                width: "100%",
                marginTop: 8,
                padding: "8px 10px",
                background: "var(--paper-200)",
                border: "1px solid var(--brass-500)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ minWidth: 0 }}>
                {prochain ? (
                  <>
                    <span
                      style={{
                        display: "block",
                        fontFamily: "var(--font-mono)",
                        fontSize: 8.5,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        color: "var(--brass-700)",
                      }}
                    >
                      {tr(d.sheets.prochainNiv, { n: prochain.niveau })}
                    </span>
                    <span
                      style={{
                        display: "block",
                        fontFamily: "var(--font-display)",
                        fontSize: 12,
                        color: "var(--forest-800)",
                        fontWeight: 700,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {titreDeblocage(prochain, locale)}
                    </span>
                  </>
                ) : (
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 12,
                      color: "var(--forest-800)",
                      fontWeight: 700,
                    }}
                  >
                    {d.bibliotheque.parcoursDeblocages}
                  </span>
                )}
              </span>
              <ChevronRight
                size={18}
                strokeWidth={1.8}
                color="var(--brass-700)"
              />
            </button>
          </div>
        }
      >
        {/* Nom de l'arbre sélectionné, en tête de la section basse. */}
        <div
          style={{
            textAlign: "center",
            fontFamily: "var(--font-display)",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--forest-800)",
            fontWeight: 700,
            marginBottom: 10,
          }}
        >
          {nomArbre(meta, locale)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {treeDef?.branches.map((branche) => {
            const comps = competencesParBranche(tree, branche.id).sort(
              (a, b) => a.niveauBrocanteurRequis - b.niveauBrocanteurRequis,
            );
            if (comps.length === 0) return null;
            const brancheDescription = descriptionBranche(tree, branche, locale);
            // Leçon guidée (premier point) : la main désigne la branche
            // "presentation" pendant la phase "branche" — c'est le tap du
            // bon palier (pas de la section, rien n'y est cliquable) qui
            // fait avancer la leçon. Piège de clipping (cf. Global
            // Constraints) : le panneau bas défile (overflowY: auto sur
            // FloatingRoomOverlay), donc position/zIndex/contentVisibility
            // en inline, comme CollectionGrid.tsx / StockageItemRow.tsx.
            const mainBranche =
              !!guide && phaseLecon === "branche" && branche.id === guide.brancheId;
            const estBrancheGuidee = !!guide && branche.id === guide.brancheId;
            return (
              <section
                key={branche.id}
                ref={estBrancheGuidee ? brancheGuideeRef : undefined}
                className={mainBranche ? "tuto-main tuto-main-droite" : undefined}
                style={
                  mainBranche
                    ? { position: "relative", zIndex: 2, contentVisibility: "visible" }
                    : undefined
                }
              >
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 11,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--forest-800)",
                    margin: "0 0 4px",
                    padding: "0 2px",
                    fontWeight: 700,
                  }}
                >
                  {nomBranche(tree, branche, locale)}
                </h3>
                {brancheDescription && (
                  <p
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontStyle: "italic",
                      fontSize: 11.5,
                      color: "var(--ink-500)",
                      margin: "0 0 6px 2px",
                      lineHeight: 1.3,
                    }}
                  >
                    {brancheDescription}
                  </p>
                )}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${comps.length}, 1fr)`,
                    gap: 6,
                  }}
                >
                  {comps.map((c) => {
                    const etat = etatCompetence(
                      c,
                      state.competencesDebloquees,
                      contexteDepuisState(state),
                    );
                    const estPalierGuide = !!guide && c.id === guide.competenceId;
                    return (
                      <PalierTile
                        key={c.id}
                        comp={c}
                        etat={etat}
                        onTap={() => {
                          if (enLecon) {
                            // Leçon en cours : seul le palier désigné répond
                            // (autre branche ou autre palier de la bonne
                            // branche = tap ignoré).
                            if (estPalierGuide) {
                              setPalierActif(c);
                              setPhaseLecon("palier");
                            }
                            return;
                          }
                          setPalierActif(c);
                        }}
                        main={estPalierGuide && phaseLecon === "branche"}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </FloatingRoomOverlay>

      {palierActif && (
          <PalierOverlay
            comp={palierActif}
            tree={tree}
            pointsDisponibles={state.brocanteur.pointsDisponibles}
            competencesDebloquees={state.competencesDebloquees}
            etat={etatCompetence(
              palierActif,
              state.competencesDebloquees,
              contexteDepuisState(state),
          )}
            onClose={() => setPalierActif(null)}
            onAcheter={() => {
              const res = debloquerCompetence(palierActif.id);
              if (res.ok) {
                toast(
                  tr(d.bibliotheque.competenceAcquiseToast, {
                    nom: nomCompetence(palierActif, locale),
                  }),
                  { type: "succes" },
                );
                // Leçon guidée : l'achat du premier point désigné ouvre le
                // dialogue de clôture (tuto_niveau_apres) par-dessus.
                if (
                  etapeTuto === "competences-choix" &&
                  palierActif.id === guide?.competenceId
                ) {
                  setPhaseLecon("dialogue");
                }
                setPalierActif(null);
              } else {
                toast(
                  tr(d.inventaire.impossibleRaison, {
                    raison: res.raison ?? d.inventaire.conditionNonRemplie,
                  }),
                  { type: "erreur" },
                );
              }
            }}
          />
      )}

      <ParcoursSheet
        open={parcoursOuvert}
        onClose={() => setParcoursOuvert(false)}
        niveau={state.brocanteur.niveau}
      />

      {enLecon && phaseLecon === "coach" && (
        <TutorielCoach
          etapes={[
            { cible: "competences-xp", texte: d.tutoriel.coachCompetencesXp },
            { cible: "competences-arbres", texte: d.tutoriel.coachCompetencesArbres },
            { cible: "competences-point", texte: d.tutoriel.coachCompetencesPoint },
          ]}
          onFini={() => {
            setPhaseLecon("branche");
            avancerTutoriel("competences-choix");
          }}
        />
      )}
      {enLecon && phaseLecon === "dialogue" && (
        <DialogueOverlay
          sequence={SEQUENCES_TUTORIEL.tuto_niveau_apres}
          nom={nomExpediteur("grand-pere", locale)}
          portraits={GRAND_PERE_PORTRAITS}
          onFini={() => avancerTutoriel("conclusion")}
        />
      )}
    </>
  );
}

function PalierTile({
  comp,
  etat,
  onTap,
  main,
}: {
  comp: CompetenceDef;
  etat: "debloquee" | "disponible" | "verrouillee";
  onTap: () => void;
  /** Leçon guidée (premier point) : cette tuile porte la main du tutoriel. */
  main?: boolean;
}) {
  const { tr, d, locale } = useLangue();
  const isDebloquee = etat === "debloquee";
  const isDisponible = etat === "disponible";
  const isVerrouillee = etat === "verrouillee";

  const baseStyle = {
    position: "relative" as const,
    aspectRatio: "1/1",
    border: "1px solid var(--brass-500)",
    cursor: "pointer",
    padding: 0,
    overflow: "hidden" as const,
    background: "var(--paper-300)",
  };

  const styleByState = isVerrouillee
    ? {
        ...baseStyle,
        borderStyle: "dashed" as const,
        borderColor: "var(--paper-500)",
      }
    : baseStyle;

  // Piège de clipping (cf. Global Constraints, précédent StockageItemRow
  // `wrapGuide`) : cette tuile a SON PROPRE `overflow: hidden` (recadrage de
  // l'image au carré) — sans l'override, il rognerait le ::after de la main
  // dessiné hors de la boîte AVANT même d'atteindre le panneau défilant
  // ancêtre. `overflow: visible` s'ajoute donc aux trois styles habituels.
  const finalStyle = main
    ? {
        ...styleByState,
        position: "relative" as const,
        overflow: "visible" as const,
        zIndex: 2,
        contentVisibility: "visible" as const,
      }
    : styleByState;

  return (
    <button
      type="button"
      onClick={onTap}
      className={main ? "tuto-main tuto-main-droite" : undefined}
      style={finalStyle}
      title={nomCompetence(comp, locale)}
    >
      <img
        src={visuelCompetence(comp)}
        alt=""
        loading="lazy"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          // La couleur est réservée aux compétences POSSÉDÉES : les
          // achetables restent grises (pleines), les verrouillées grises
          // et estompées.
          filter: isDebloquee ? undefined : "grayscale(1)",
          opacity: isVerrouillee ? 0.55 : 1,
        }}
      />
      {/* Achetable : liseré laiton épais qui signale « à portée ». */}
      {isDisponible && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            boxShadow: "inset 0 0 0 3px var(--brass-500)",
          }}
        />
      )}
      {isDebloquee && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            boxShadow:
              "inset 0 0 0 2px var(--forest-800), inset 0 0 0 3px var(--brass-500)",
          }}
        />
      )}
      {isDebloquee && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 3,
            right: 3,
            width: 16,
            height: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--forest-800)",
            color: "var(--brass-300)",
            fontFamily: "var(--font-display)",
            fontSize: 10,
            lineHeight: 1,
          }}
        >
          ✓
        </span>
      )}
      {comp.niveauBrocanteurRequis > 0 && (
        <span
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "2px 0",
            textAlign: "center",
            background: "color-mix(in srgb, var(--paper-100) 82%, transparent)",
            color: isVerrouillee ? "var(--ink-500)" : "var(--forest-800)",
            fontFamily: "var(--font-mono)",
            fontSize: 8,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {tr(d.bibliotheque.niveauAbrege, { n: comp.niveauBrocanteurRequis })}
        </span>
      )}
    </button>
  );
}


/**
 * Rend une description en mettant les chiffres clés en gras (nombres,
 * pourcentages, durées, multiplicateurs) — split par groupe capturant :
 * les indices impairs sont les tokens numériques.
 */
function DescriptionChiffree({ texte }: { texte: string }) {
  const parts = texte.split(
    /((?:×\s?)?[+±]?\d[\d\s.,]*(?:%|min\b|h\b|€)?)/gu,
  );
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} style={{ fontStyle: "normal" }}>
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  );
}

/**
 * Fiche compétence plein écran : image dans son cadre, flottante au centre
 * (titre encadré au-dessus), + panneau qui monte du bas de l'écran
 * (description encadrée, action). Tap hors du panneau → fermeture.
 */
function PalierOverlay({
  comp,
  tree: _tree,
  pointsDisponibles,
  competencesDebloquees,
  etat,
  onAcheter,
  onClose,
}: {
  comp: CompetenceDef;
  tree: CompetenceTreeId;
  pointsDisponibles: number;
  competencesDebloquees: readonly CompetenceId[];
  etat: "debloquee" | "disponible" | "verrouillee";
  onAcheter: () => void;
  onClose: () => void;
}) {
  const { d, tr, locale } = useLangue();
  const isDebloquee = etat === "debloquee";
  const isVerrouillee = etat === "verrouillee";
  const peutPayer = pointsDisponibles >= comp.coutPoints;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={nomCompetence(comp, locale)}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 105,
        background: "rgba(15,31,24,0.82)",
        display: "flex",
        flexDirection: "column",
        animation: "broc-fade-in 160ms ease",
      }}
    >
      {/* Zone centrale : cadre flottant (tap à côté → fermeture). */}
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          placeItems: "center",
          padding: 20,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Titre encadré, centré et aligné sur la largeur de l'image. */}
      <div
        style={{
          width: "min(330px, 85vw)",
          margin: "0 auto",
          padding: "8px 10px",
          border: "1px solid var(--brass-500)",
          background: "var(--paper-200)",
          textAlign: "center",
          fontFamily: "var(--font-display)",
          fontSize: 13,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--forest-800)",
          fontWeight: 700,
        }}
      >
        {nomCompetence(comp, locale)}
      </div>

      <div
        style={{
          position: "relative",
          width: "min(330px, 85vw)",
          margin: "0 auto",
          aspectRatio: "1/1",
          background: "var(--paper-300)",
        }}
      >
        <img
          src={visuelCompetence(comp)}
          alt={nomCompetence(comp, locale)}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: isVerrouillee ? "grayscale(1)" : undefined,
            opacity: isVerrouillee ? 0.6 : 1,
          }}
        />
        <img
          src="/competences/frame.svg"
          alt=""
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        />
      </div>

          {/* Description encadrée, sous l'image. */}
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 16.5,
              color: "var(--ink-700)",
              margin: 0,
              lineHeight: 1.4,
              padding: "10px 12px",
              border: "1px solid var(--brass-500)",
              background: "var(--paper-100)",
              width: "min(330px, 85vw)",
              boxSizing: "border-box",
            }}
          >
            <DescriptionChiffree texte={descriptionCompetence(comp, locale)} />
          </p>
        </div>
      </div>

      {/* Panneau bas : monte de l'écran (même langage que les tiroirs).
          Rien à afficher pour une verrouillée → pas de panneau. */}
      {!isVerrouillee && (
      <div
        style={{
          background: "var(--paper-200)",
          borderTop: "2px solid var(--forest-800)",
          borderRadius: "14px 14px 0 0",
          boxShadow: "0 -6px 18px rgba(40,25,5,0.20)",
          padding: "16px 16px calc(16px + var(--safe-bottom))",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          animation: "broc-slide-up 200ms ease",
        }}
      >
      {isDebloquee ? (
        <div
          style={{
            padding: "10px 12px",
            background: "var(--patina-500)",
            color: "var(--paper-100)",
            textAlign: "center",
            fontFamily: "var(--font-display)",
            fontSize: 12,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            border: "1px solid var(--patina-500)",
          }}
        >
          {d.bibliotheque.competenceAcquiseBanniere}
        </div>
      ) : isVerrouillee ? null : (
        <button
          type="button"
          onClick={onAcheter}
          disabled={!peutPayer}
          style={{
            width: "100%",
            padding: "12px",
            background: peutPayer ? "var(--forest-800)" : "var(--paper-300)",
            color: peutPayer ? "var(--brass-300)" : "var(--ink-500)",
            border: "1px solid var(--brass-500)",
            fontFamily: "var(--font-display)",
            fontSize: 12,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            cursor: peutPayer ? "pointer" : "not-allowed",
            opacity: peutPayer ? 1 : 0.6,
          }}
        >
          {d.bibliotheque.acheterBouton}
        </button>
      )}
      </div>
      )}
    </div>
  );
}
