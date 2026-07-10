"use client";

import { useEffect, useState } from "react";
import { FloatingRoomOverlay } from "@/components/mobile/floating-room/FloatingRoomOverlay";
import { PageHeaderBar } from "@/components/mobile/PageHeaderBar";
import { TreePicker } from "@/components/mobile/TreePicker";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { useToast } from "@/components/ui/Toast";
import { useGame } from "@/context/GameContext";
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
import { contexteDepuisState, etatCompetence } from "@/lib/competences";
import { detailProgressionBrocanteur, progressionNiveauBrocanteur } from "@/lib/xp";
import { prochainDeblocage } from "@/data/deblocagesNiveau";
import { ParcoursSheet } from "@/components/mobile/ParcoursSheet";
import { useLangue } from "@/lib/i18n/LangueContext";
import {
  descriptionBranche,
  descriptionCompetence,
  nomArbre,
  nomBranche,
  nomCompetence,
  titreDeblocage,
} from "@/lib/i18n/contenu";
import type {
  CompetenceDef,
  CompetenceId,
  CompetenceTreeId,
} from "@/types/game";

export default function CompetencesPage() {
  const { state, isHydrated, debloquerCompetence } = useGame();
  const { toast } = useToast();
  const { d, tr, locale } = useLangue();
  const [tree, setTree] = useState<CompetenceTreeId>(TREE_GENERAL);
  const [palierActif, setPalierActif] = useState<CompetenceDef | null>(null);
  const [parcoursOuvert, setParcoursOuvert] = useState(false);

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
            <div style={{ marginTop: 4 }}>
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
              style={{
                textAlign: "center",
                marginTop: 0,
                fontFamily: "var(--font-display)",
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--forest-800)",
                fontWeight: 700,
              }}
            >
              {nomArbre(meta, locale)}
            </div>
            <div
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
                <span
                  style={{
                    display: "block",
                    fontFamily: "var(--font-mono)",
                    fontSize: 8.5,
                    color: "var(--brass-700)",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                  }}
                >
                  {d.bibliotheque.niveauCaption}
                </span>
              </div>
              {/* Colonne centrale : barre épaisse + « x / y XP » centré sous
                  la barre (aligné sur sa largeur). */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    height: 16,
                    background: "var(--paper-300)",
                    border: "1px solid var(--brass-500)",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      background: "var(--brass-700)",
                      width: `${Math.round(xpProgress * 100)}%`,
                    }}
                  />
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9.5,
                    color: "var(--brass-700)",
                    letterSpacing: "0.04em",
                    textAlign: "center",
                    marginTop: 3,
                  }}
                >
                  {tr(d.bibliotheque.xpProgression, {
                    dansNiveau: dansNiveau.toLocaleString(locale),
                    requisNiveau: requisNiveau.toLocaleString(locale),
                  })}
                </div>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 14,
                  color:
                    state.brocanteur.pointsDisponibles > 0
                      ? "var(--vermillion-600)"
                      : "var(--ink-500)",
                  textAlign: "right",
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
            {/* Le bouton reste visible même sans prochain déblocage (niveau ≥ 20) : le Parcours sert aussi de récapitulatif. */}
            <button
              type="button"
              onClick={() => setParcoursOuvert(true)}
              aria-label={d.bibliotheque.voirParcoursAria}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
                fontSize: 9.5,
                color: "var(--brass-700)",
                letterSpacing: "0.06em",
                padding: "4px 2px 0",
              }}
            >
              {prochain
                ? `${tr(d.sheets.prochainNiv, { n: prochain.niveau })} ${titreDeblocage(prochain, locale)} ▸`
                : d.bibliotheque.parcoursDeblocages}
            </button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {treeDef?.branches.map((branche) => {
            const comps = competencesParBranche(tree, branche.id).sort(
              (a, b) => a.niveauBrocanteurRequis - b.niveauBrocanteurRequis,
            );
            if (comps.length === 0) return null;
            const brancheDescription = descriptionBranche(tree, branche, locale);
            return (
              <section key={branche.id}>
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
                    return (
                      <PalierTile
                        key={c.id}
                        comp={c}
                        etat={etat}
                        onTap={() => setPalierActif(c)}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </FloatingRoomOverlay>

      <BottomSheet
        open={palierActif !== null}
        onClose={() => setPalierActif(null)}
        title={palierActif ? nomCompetence(palierActif, locale) : ""}
      >
        {palierActif && (
          <PalierDetail
            comp={palierActif}
            tree={tree}
            niveauActuel={state.brocanteur.niveau}
            pointsDisponibles={state.brocanteur.pointsDisponibles}
            competencesDebloquees={state.competencesDebloquees}
            etat={etatCompetence(
              palierActif,
              state.competencesDebloquees,
              contexteDepuisState(state),
            )}
            onAcheter={() => {
              const res = debloquerCompetence(palierActif.id);
              if (res.ok) {
                toast(
                  tr(d.bibliotheque.competenceAcquiseToast, {
                    nom: nomCompetence(palierActif, locale),
                  }),
                  { type: "succes" },
                );
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
      </BottomSheet>

      <ParcoursSheet
        open={parcoursOuvert}
        onClose={() => setParcoursOuvert(false)}
        niveau={state.brocanteur.niveau}
      />
    </>
  );
}

function PalierTile({
  comp,
  etat,
  onTap,
}: {
  comp: CompetenceDef;
  etat: "debloquee" | "disponible" | "verrouillee";
  onTap: () => void;
}) {
  const { tr, d, locale } = useLangue();
  const isDebloquee = etat === "debloquee";
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

  return (
    <button
      type="button"
      onClick={onTap}
      style={styleByState}
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
          filter: isVerrouillee ? "grayscale(1)" : undefined,
          opacity: isVerrouillee ? 0.55 : 1,
        }}
      />
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

function PalierDetail({
  comp,
  tree: _tree,
  niveauActuel,
  pointsDisponibles,
  competencesDebloquees,
  etat,
  onAcheter,
}: {
  comp: CompetenceDef;
  tree: CompetenceTreeId;
  niveauActuel: number;
  pointsDisponibles: number;
  competencesDebloquees: readonly CompetenceId[];
  etat: "debloquee" | "disponible" | "verrouillee";
  onAcheter: () => void;
}) {
  const { d, tr, locale } = useLangue();
  const isDebloquee = etat === "debloquee";
  const isVerrouillee = etat === "verrouillee";
  const peutPayer = pointsDisponibles >= comp.coutPoints;

  // Find branch name for the eyebrow label
  const treeDef = getTreeDef(comp.treeId);
  const branche = treeDef?.branches.find((b) => b.id === comp.brancheId);

  const prerequisRemplis = comp.prerequis.every((p) =>
    competencesDebloquees.includes(p),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {branche && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--brass-700)",
          }}
        >
          {nomBranche(comp.treeId, branche, locale)}
        </div>
      )}

      <div
        style={{
          position: "relative",
          width: "100%",
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

      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: 14,
          color: "var(--ink-700)",
          margin: 0,
          lineHeight: 1.4,
        }}
      >
        {descriptionCompetence(comp, locale)}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--ink-700)",
          padding: "8px 10px",
          border: "1px solid var(--brass-500)",
          background: "var(--paper-200)",
        }}
      >
        {comp.niveauBrocanteurRequis > 0 && (
          <div>
            {d.bibliotheque.niveauRequisLabel}{" "}
            <strong style={{ fontFamily: "var(--font-display)" }}>
              {tr(d.bibliotheque.niveauAbrege, { n: comp.niveauBrocanteurRequis })}
            </strong>
            <br />
            <span
              style={{
                color:
                  niveauActuel >= comp.niveauBrocanteurRequis
                    ? "var(--forest-700)"
                    : "var(--vermillion-600)",
              }}
            >
              {tr(d.bibliotheque.actuelNiveau, { n: niveauActuel })}
            </span>
          </div>
        )}
        <div>
          {d.bibliotheque.coutLabel}{" "}
          <strong style={{ fontFamily: "var(--font-display)" }}>
            {comp.coutPoints}{" "}
            {comp.coutPoints > 1
              ? d.bibliotheque.pointPluriel
              : d.bibliotheque.pointUnique}
          </strong>
          <br />
          <span
            style={{
              color: peutPayer
                ? "var(--forest-700)"
                : "var(--vermillion-600)",
            }}
          >
            {d.bibliotheque.dispoLabel} {pointsDisponibles}{" "}
            {pointsDisponibles > 1
              ? d.bibliotheque.pointPluriel
              : d.bibliotheque.pointUnique}
          </span>
        </div>
      </div>

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
      ) : isVerrouillee ? (
        <div
          style={{
            padding: "10px 12px",
            background: "var(--paper-200)",
            border: "1px dashed var(--vermillion-600)",
            color: "var(--vermillion-600)",
            textAlign: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.06em",
          }}
        >
          {d.bibliotheque.verrouilleePrefixe}{" "}
          {!prerequisRemplis
            ? d.bibliotheque.palierPrecedentRequis
            : niveauActuel < comp.niveauBrocanteurRequis
              ? tr(d.bibliotheque.niveauRequisAvecActuel, {
                  requis: comp.niveauBrocanteurRequis,
                  actuel: niveauActuel,
                })
              : d.bibliotheque.pasAssezDePoints}
        </div>
      ) : (
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
          {peutPayer
            ? tr(d.bibliotheque.acheterBouton, {
                cout: comp.coutPoints,
                unite:
                  comp.coutPoints > 1
                    ? d.bibliotheque.pointPluriel
                    : d.bibliotheque.pointUnique,
              })
            : d.bibliotheque.pointsInsuffisants}
        </button>
      )}
    </div>
  );
}
