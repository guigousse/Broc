"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { StickyTop } from "@/components/mobile/StickyTop";
import { PageHeaderBar } from "@/components/mobile/PageHeaderBar";
import { TreePicker } from "@/components/mobile/TreePicker";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { SkeletonScreen } from "@/components/ui/SkeletonScreen";
import { useToast } from "@/components/ui/Toast";
import { useGame } from "@/context/GameContext";
import {
  COMPETENCES,
  TREE_GENERAL,
  getTreeDef,
  getTreeMeta,
  competencesParBranche,
} from "@/data/competences";
import { etatCompetence } from "@/lib/competences";
import { progressionNiveau } from "@/lib/xp";
import type { CompetenceDef, CompetenceTreeId } from "@/types/game";

export default function CompetencesPage() {
  const router = useRouter();
  const { state, isHydrated, debloquerCompetence } = useGame();
  const { toast } = useToast();
  const [tree, setTree] = useState<CompetenceTreeId>(TREE_GENERAL);
  const [palierActif, setPalierActif] = useState<CompetenceDef | null>(null);

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  // When user switches tree, close any open detail sheet
  useEffect(() => {
    setPalierActif(null);
  }, [tree]);

  if (!isHydrated || !state) {
    return <SkeletonScreen label="— consultation du grimoire…" />;
  }

  const treeState = state.competenceTrees[tree];
  const meta = getTreeMeta(tree);
  const treeDef = getTreeDef(tree);
  const xpProgress = progressionNiveau(treeState);

  return (
    <>
      <MobileLayout
        header={<MobileHeader budget={state.budget} />}
        stickyTop={
          <StickyTop>
            <PageHeaderBar title="Compétences" />
            <div style={{ marginTop: 4 }}>
              <TreePicker
                trees={state.competenceTrees}
                selectionne={tree}
                onSelect={setTree}
              />
            </div>
            <div
              style={{
                textAlign: "center",
                marginTop: 6,
                fontFamily: "var(--font-display)",
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--forest-800)",
                fontWeight: 700,
              }}
            >
              {meta.nom}
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
                N{treeState.niveau}
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
                  Niv.
                </span>
              </div>
              <div
                style={{
                  flex: 1,
                  height: 8,
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
                  fontFamily: "var(--font-display)",
                  fontSize: 14,
                  color:
                    treeState.pointsDisponibles > 0
                      ? "var(--vermillion-600)"
                      : "var(--ink-500)",
                  textAlign: "right",
                }}
              >
                {treeState.pointsDisponibles}
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
                  Pts
                </span>
              </div>
            </div>
          </StickyTop>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {treeDef?.branches.map((branche) => {
            const comps = competencesParBranche(tree, branche.id).sort(
              (a, b) => a.niveauBrocanteurRequis - b.niveauBrocanteurRequis,
            );
            if (comps.length === 0) return null;
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
                  {branche.nom}
                </h3>
                {branche.description && (
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
                    {branche.description}
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
                      treeState,
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
      </MobileLayout>

      <BottomSheet
        open={palierActif !== null}
        onClose={() => setPalierActif(null)}
        title={palierActif?.nom ?? ""}
      >
        {palierActif && (
          <PalierDetail
            comp={palierActif}
            tree={tree}
            niveauActuel={treeState.niveau}
            pointsDisponibles={treeState.pointsDisponibles}
            etat={etatCompetence(
              palierActif,
              state.competencesDebloquees,
              treeState,
            )}
            onAcheter={() => {
              const res = debloquerCompetence(palierActif.id);
              if (res.ok) {
                toast(`Compétence acquise : ${palierActif.nom}`, {
                  type: "succes",
                });
                setPalierActif(null);
              } else {
                toast(
                  `Impossible : ${res.raison ?? "condition non remplie"}`,
                  { type: "erreur" },
                );
              }
            }}
          />
        )}
      </BottomSheet>
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
  const isDebloquee = etat === "debloquee";
  const isVerrouillee = etat === "verrouillee";

  const baseStyle = {
    position: "relative" as const,
    aspectRatio: "1/1",
    border: "1px solid var(--brass-500)",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 2,
    padding: 4,
    fontFamily: "var(--font-display)",
  };

  const styleByState = isDebloquee
    ? {
        ...baseStyle,
        background: "var(--forest-800)",
        color: "var(--brass-300)",
        boxShadow:
          "inset 0 0 0 2px var(--forest-800), inset 0 0 0 3px var(--brass-500)",
      }
    : isVerrouillee
      ? {
          ...baseStyle,
          background: "var(--paper-300)",
          color: "var(--ink-300)",
          borderStyle: "dashed" as const,
          borderColor: "var(--paper-500)",
        }
      : {
          ...baseStyle,
          background: "var(--paper-100)",
          color: "var(--forest-800)",
        };

  return (
    <button
      type="button"
      onClick={onTap}
      style={styleByState}
      title={comp.nom}
    >
      {isDebloquee && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 3,
            right: 4,
            fontFamily: "var(--font-display)",
            fontSize: 10,
            color: "var(--brass-300)",
          }}
        >
          ✓
        </span>
      )}
      <span style={{ fontSize: 18, fontWeight: 700 }}>
        {comp.palierNumero}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 8,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          opacity: 0.85,
        }}
      >
        N{comp.niveauBrocanteurRequis}
      </span>
    </button>
  );
}

function PalierDetail({
  comp,
  tree: _tree,
  niveauActuel,
  pointsDisponibles,
  etat,
  onAcheter,
}: {
  comp: CompetenceDef;
  tree: CompetenceTreeId;
  niveauActuel: number;
  pointsDisponibles: number;
  etat: "debloquee" | "disponible" | "verrouillee";
  onAcheter: () => void;
}) {
  const isDebloquee = etat === "debloquee";
  const isVerrouillee = etat === "verrouillee";
  const peutPayer = pointsDisponibles >= comp.coutPoints;

  // Find branch name for the eyebrow label
  const treeDef = getTreeDef(comp.treeId);
  const branche = treeDef?.branches.find((b) => b.id === comp.brancheId);

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
          {branche.nom}
        </div>
      )}

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
        {comp.description}
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
        <div>
          Niveau requis :{" "}
          <strong style={{ fontFamily: "var(--font-display)" }}>
            N{comp.niveauBrocanteurRequis}
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
            Actuel : N{niveauActuel}
          </span>
        </div>
        <div>
          Coût :{" "}
          <strong style={{ fontFamily: "var(--font-display)" }}>
            {comp.coutPoints} pt{comp.coutPoints > 1 ? "s" : ""}
          </strong>
          <br />
          <span
            style={{
              color: peutPayer
                ? "var(--forest-700)"
                : "var(--vermillion-600)",
            }}
          >
            Dispo : {pointsDisponibles} pt{pointsDisponibles > 1 ? "s" : ""}
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
          Compétence acquise ✓
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
          ⊘ Verrouillée — N{comp.niveauBrocanteurRequis} requis (vous avez N
          {niveauActuel})
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
            ? `Acheter · ${comp.coutPoints} pt${comp.coutPoints > 1 ? "s" : ""}`
            : "Points insuffisants"}
        </button>
      )}
    </div>
  );
}
