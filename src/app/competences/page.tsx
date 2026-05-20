"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { StickyTop } from "@/components/mobile/StickyTop";
import { TreePicker } from "@/components/mobile/TreePicker";
import { useGame } from "@/context/GameContext";
import {
  COMPETENCES,
  TREE_GENERAL,
  getTreeMeta,
} from "@/data/competences";
import { etatCompetence } from "@/lib/competences";
import { progressionNiveau } from "@/lib/xp";
import type { CompetenceDef, CompetenceTreeId } from "@/types/game";

const eyebrow = {
  fontFamily: "var(--font-display)",
  fontSize: 9,
  letterSpacing: "0.24em",
  textTransform: "uppercase" as const,
  color: "var(--brass-700)",
  textAlign: "center" as const,
  marginBottom: 8,
};

export default function CompetencesPage() {
  const router = useRouter();
  const { state, isHydrated, debloquerCompetence } = useGame();
  const [tree, setTree] = useState<CompetenceTreeId>(TREE_GENERAL);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  const competencesArbre = useMemo(
    () =>
      COMPETENCES.filter((c) => c.treeId === tree).sort(
        (a, b) => a.niveauRequis - b.niveauRequis,
      ),
    [tree],
  );

  if (!isHydrated || !state) {
    return (
      <main
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          fontFamily: "var(--font-mono)",
          color: "var(--ink-500)",
          fontSize: 12,
        }}
      >
        — consultation du grimoire…
      </main>
    );
  }

  const treeState = state.competenceTrees[tree];
  const meta = getTreeMeta(tree);
  const xpProgress = progressionNiveau(treeState);

  return (
    <MobileLayout
      header={<MobileHeader jour={state.jourActuel} budget={state.budget} />}
      stickyTop={
        <StickyTop>
          <div style={eyebrow}>— Grimoire des compétences —</div>
          <TreePicker
            trees={state.competenceTrees}
            selectionne={tree}
            onSelect={setTree}
          />
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
      {flash && (
        <div
          style={{
            padding: "10px 12px",
            background: "var(--brass-100)",
            border: "1px solid var(--brass-700)",
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 12.5,
            color: "var(--ink-700)",
            marginBottom: 8,
          }}
        >
          « {flash} »
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {competencesArbre.map((c) => (
          <CompetenceCard
            key={c.id}
            comp={c}
            etat={etatCompetence(
              c,
              state.competencesDebloquees,
              state.competenceTrees[c.treeId],
            )}
            onAcheter={() => {
              const res = debloquerCompetence(c.id);
              if (res.ok) setFlash(`Compétence acquise : ${c.nom}.`);
              else
                setFlash(
                  `Impossible : ${res.raison ?? "condition non remplie"}.`,
                );
              setTimeout(() => setFlash(null), 2500);
            }}
          />
        ))}
      </div>
    </MobileLayout>
  );
}

function CompetenceCard({
  comp,
  etat,
  onAcheter,
}: {
  comp: CompetenceDef;
  etat: "debloquee" | "disponible" | "verrouillee";
  onAcheter: () => void;
}) {
  const isAcquired = etat === "debloquee";
  const isLocked = etat === "verrouillee";
  const isAvailable = etat === "disponible";
  return (
    <article
      style={{
        border: `1px solid ${isAcquired ? "var(--brass-700)" : "var(--brass-500)"}`,
        background: isAcquired ? "var(--brass-100)" : "var(--paper-100)",
        opacity: isLocked ? 0.5 : 1,
        padding: 10,
        display: "grid",
        gridTemplateColumns: "36px 1fr auto",
        gap: 10,
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          display: "grid",
          placeItems: "center",
          border: "1px solid var(--brass-500)",
          color: "var(--brass-700)",
          fontFamily: "var(--font-display)",
          fontSize: 18,
        }}
      >
        ✦
      </div>
      <div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--forest-800)",
            fontWeight: 700,
          }}
        >
          {comp.nom}
        </div>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 11.5,
            color: "var(--ink-500)",
            marginTop: 2,
            lineHeight: 1.3,
          }}
        >
          {comp.description}
        </div>
        {comp.niveauRequis > 0 && (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "var(--brass-700)",
              marginTop: 3,
            }}
          >
            Requis : N{comp.niveauRequis}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onAcheter}
        disabled={!isAvailable}
        style={{
          padding: "6px 8px",
          fontFamily: "var(--font-display)",
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          border: "1px solid var(--brass-500)",
          background: isAcquired
            ? "var(--patina-500)"
            : isAvailable
              ? "var(--forest-800)"
              : "var(--paper-300)",
          color: isAcquired
            ? "var(--paper-100)"
            : isAvailable
              ? "var(--brass-300)"
              : "var(--ink-500)",
          cursor: isAvailable ? "pointer" : "not-allowed",
        }}
      >
        {isAcquired
          ? "Acquise"
          : isLocked
            ? "Verrouillée"
            : `${comp.coutPoints} pt${comp.coutPoints > 1 ? "s" : ""}`}
      </button>
    </article>
  );
}
