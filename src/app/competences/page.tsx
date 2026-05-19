"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBar } from "@/components/StatusBar";
import { Button } from "@/components/ui/Button";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { DecoDivider } from "@/components/ui/DecoDivider";
import { Panel } from "@/components/ui/Panel";
import { useGame } from "@/context/GameContext";
import {
  ALL_TREE_IDS,
  COMPETENCES,
  TREE_GENERAL,
  getTreeDef,
  getTreeMeta,
} from "@/data/competences";
import { etatCompetence } from "@/lib/competences";
import { progressionNiveau, xpRequisPourNiveau } from "@/lib/xp";
import type {
  CompetenceDef,
  CompetenceTreeId,
  CompetenceTreeState,
} from "@/types/game";

export default function CompetencesPage() {
  const router = useRouter();
  const { state, isHydrated, debloquerCompetence } = useGame();
  const [flash, setFlash] = useState<string | null>(null);
  const [treeSelectionne, setTreeSelectionne] =
    useState<CompetenceTreeId>(TREE_GENERAL);

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  const treeActuel = useMemo(
    () => state?.competenceTrees[treeSelectionne],
    [state, treeSelectionne],
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
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontSize: 12,
        }}
      >
        — consultation du grimoire…
      </main>
    );
  }

  const handleDebloquer = (id: string) => {
    const res = debloquerCompetence(id);
    if (res.ok) {
      const comp = COMPETENCES.find((c) => c.id === id);
      setFlash(`Compétence acquise : ${comp?.nom}.`);
    } else {
      setFlash(res.raison ?? "Impossible de débloquer.");
    }
  };

  const meta = getTreeMeta(treeSelectionne);
  const def = getTreeDef(treeSelectionne);

  return (
    <div
      className="bg-paper-grain"
      style={{ minHeight: "100dvh", padding: "20px 28px 32px" }}
    >
      <StatusBar jour={state.jourActuel} budget={state.budget} />

      <div
        style={{
          maxWidth: 1280,
          margin: "32px auto 0",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <header
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 16,
          }}
        >
          <div>
            <div className="eyebrow">— grimoire du chineur —</div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 36,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--forest-800)",
                margin: "4px 0 8px",
                lineHeight: 1.1,
              }}
            >
              Compétences
            </h1>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                color: "var(--ink-500)",
                fontSize: 16,
                margin: 0,
                maxWidth: 540,
              }}
            >
              Chaque arbre se décline en branches. Investissez vos points dans
              les paliers qui servent votre commerce.
            </p>
          </div>
          <Link href="/qg">
            <Button variant="ghost" size="sm">
              ← Retour au QG
            </Button>
          </Link>
        </header>

        <DecoDivider />

        {flash && (
          <div
            style={{
              padding: "12px 16px",
              background: "var(--paper-100)",
              border: "1px solid var(--brass-500)",
              boxShadow:
                "inset 0 0 0 3px var(--paper-100), inset 0 0 0 4px var(--brass-700)",
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 15,
              color: "var(--ink-700)",
            }}
          >
            « {flash} »
          </div>
        )}

        {/* Sélecteur d'arbres */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 10,
          }}
        >
          {ALL_TREE_IDS.map((id) => (
            <TreeTab
              key={id}
              treeId={id}
              tree={state.competenceTrees[id]}
              selected={id === treeSelectionne}
              onClick={() => setTreeSelectionne(id)}
            />
          ))}
        </div>

        <Panel
          eyebrow={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              —
              {meta.categorie ? (
                <CategorieIcon
                  categorie={meta.categorie}
                  size={12}
                  color="var(--brass-700)"
                />
              ) : (
                <span>{meta.emoji}</span>
              )}
              {meta.type === "general" ? "général" : "spécialisation"}
              —
            </span>
          }
          title={meta.nom}
        >
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 14,
              color: "var(--ink-500)",
              margin: "0 0 14px",
              textAlign: "center",
            }}
          >
            {meta.baseline}
          </p>

          {treeActuel && <XPBar tree={treeActuel} />}

          {def && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${def.branches.length}, minmax(0, 1fr))`,
                gap: 14,
                marginTop: 18,
              }}
            >
              {def.branches.map((br) => (
                <BrancheColumn
                  key={br.id}
                  nom={br.nom}
                  description={br.description}
                  competences={br.paliers.map((p) => ({
                    palier: p,
                    competence: COMPETENCES.find(
                      (c) =>
                        c.treeId === treeSelectionne &&
                        c.brancheId === br.id &&
                        c.palierNumero === p.numero,
                    )!,
                  }))}
                  debloquees={state.competencesDebloquees}
                  tree={treeActuel}
                  onDebloquer={handleDebloquer}
                />
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function TreeTab({
  treeId,
  tree,
  selected,
  onClick,
}: {
  treeId: CompetenceTreeId;
  tree: CompetenceTreeState | undefined;
  selected: boolean;
  onClick: () => void;
}) {
  const meta = getTreeMeta(treeId);
  const points = tree?.pointsDisponibles ?? 0;
  const [hover, setHover] = useState(false);

  // Ombrages calqués sur ceux du composant <Panel> au QG.
  const shadowLightRest =
    "inset 0 0 0 4px var(--paper-100), inset 0 0 0 5px var(--brass-500), 0 2px 0 var(--paper-400), 0 6px 14px rgba(40,25,5,0.10)";
  const shadowLightHover =
    "inset 0 0 0 4px var(--paper-100), inset 0 0 0 5px var(--brass-700), 0 4px 0 var(--brass-700), 0 14px 28px rgba(40,25,5,0.22)";
  const shadowDarkRest =
    "0 8px 28px rgba(15,30,22,0.35), inset 0 0 0 4px var(--forest-800), inset 0 0 0 5px var(--brass-700)";
  const shadowDarkHover =
    "0 14px 38px rgba(15,30,22,0.55), 0 0 0 1px var(--brass-500), inset 0 0 0 4px var(--forest-800), inset 0 0 0 5px var(--brass-500)";

  const boxShadow = selected
    ? hover ? shadowDarkHover : shadowDarkRest
    : hover ? shadowLightHover : shadowLightRest;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        padding: "12px 14px",
        background: selected ? "var(--forest-800)" : "var(--paper-100)",
        backgroundImage: selected
          ? "url(/assets/grain-overlay.svg)"
          : "url(/assets/paper-grain.svg)",
        backgroundSize: "320px 320px",
        border: `1px solid var(--brass-500)`,
        boxShadow,
        color: selected ? "var(--paper-200)" : "var(--ink-700)",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "inherit",
        transform: hover ? "translateY(-3px)" : "translateY(0)",
        transition: "transform 160ms ease, box-shadow 160ms ease",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: selected ? "var(--brass-300)" : "var(--forest-800)",
            lineHeight: 1.1,
          }}
        >
          {meta.categorie ? (
            <CategorieIcon
              categorie={meta.categorie}
              size={16}
              color={selected ? "var(--brass-300)" : "var(--brass-700)"}
            />
          ) : (
            <span>{meta.emoji}</span>
          )}
          {meta.nom}
        </span>
        {points > 0 && (
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 11,
              color: selected ? "var(--brass-100)" : "var(--vermillion-600)",
              padding: "1px 6px",
              border: `1px solid ${selected ? "var(--brass-500)" : "var(--vermillion-600)"}`,
            }}
          >
            +{points}
          </span>
        )}
      </div>
      <div
        style={{
          marginTop: 4,
          fontFamily: "var(--font-mono)",
          fontSize: 9.5,
          letterSpacing: "0.12em",
          color: selected ? "var(--brass-300)" : "var(--brass-700)",
        }}
      >
        N{tree?.niveau ?? 0} · {tree?.xp ?? 0} XP
      </div>
    </button>
  );
}

function XPBar({ tree }: { tree: CompetenceTreeState }) {
  const progress = progressionNiveau(tree);
  const seuilSuivant = xpRequisPourNiveau(tree.niveau + 1);
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--brass-700)",
        }}
      >
        <span>
          Niveau {tree.niveau} · {tree.pointsDisponibles} pt
          {tree.pointsDisponibles > 1 ? "s" : ""} à dépenser
        </span>
        <span>
          {tree.xp} / {seuilSuivant} XP
        </span>
      </div>
      <div
        style={{
          height: 8,
          background: "var(--paper-400)",
          marginTop: 6,
          border: "1px solid var(--brass-700)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${progress * 100}%`,
            background: "var(--forest-700)",
          }}
        />
      </div>
    </div>
  );
}

function BrancheColumn({
  nom,
  description,
  competences,
  debloquees,
  tree,
  onDebloquer,
}: {
  nom: string;
  description?: string;
  competences: Array<{ palier: { numero: number }; competence: CompetenceDef }>;
  debloquees: string[];
  tree: CompetenceTreeState | undefined;
  onDebloquer: (id: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <header
        style={{
          textAlign: "center",
          paddingBottom: 8,
          borderBottom: "1px solid var(--brass-700)",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--forest-800)",
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          {nom}
        </h3>
        {description && (
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 12,
              color: "var(--ink-500)",
              margin: "4px 0 0",
            }}
          >
            {description}
          </p>
        )}
      </header>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {competences.map(({ competence }) => (
          <PalierCard
            key={competence.id}
            comp={competence}
            etat={etatCompetence(competence, debloquees, tree)}
            onDebloquer={() => onDebloquer(competence.id)}
          />
        ))}
      </ul>
    </div>
  );
}

function PalierCard({
  comp,
  etat,
  onDebloquer,
}: {
  comp: CompetenceDef;
  etat: "debloquee" | "disponible" | "verrouillee";
  onDebloquer: () => void;
}) {
  const isDeb = etat === "debloquee";
  const isDispo = etat === "disponible";

  return (
    <li
      style={{
        position: "relative",
        padding: "10px 12px",
        background: isDeb ? "var(--forest-800)" : "var(--paper-100)",
        border: `1px solid ${isDeb ? "var(--brass-500)" : "var(--brass-700)"}`,
        boxShadow: isDeb
          ? "inset 0 0 0 3px var(--forest-800), inset 0 0 0 4px var(--brass-500)"
          : "0 2px 0 var(--paper-400)",
        color: isDeb ? "var(--paper-200)" : "var(--ink-700)",
        opacity: etat === "verrouillee" ? 0.55 : 1,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.16em",
            color: isDeb ? "var(--brass-300)" : "var(--brass-700)",
          }}
        >
          PALIER {comp.palierNumero} · N{comp.niveauRequis}
        </span>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 10,
            letterSpacing: "0.16em",
            color: isDeb ? "var(--brass-300)" : "var(--brass-700)",
            whiteSpace: "nowrap",
          }}
        >
          {comp.coutPoints} pt{comp.coutPoints > 1 ? "s" : ""}
        </span>
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: isDeb ? "var(--brass-300)" : "var(--forest-800)",
          marginTop: 4,
          lineHeight: 1.2,
        }}
      >
        {comp.nom}
      </div>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 12,
          color: isDeb ? "var(--paper-300)" : "var(--ink-500)",
          margin: "5px 0 0",
          lineHeight: 1.4,
        }}
      >
        {comp.description}
      </p>
      {comp.placeholder && !isDeb && (
        <div
          style={{
            marginTop: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--vermillion-600)",
            fontStyle: "italic",
          }}
        >
          effet à venir
        </div>
      )}
      <div style={{ marginTop: 8 }}>
        {isDeb ? (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--brass-300)",
            }}
          >
            ✦ acquise
          </span>
        ) : isDispo ? (
          <Button variant="primary" size="sm" onClick={onDebloquer}>
            Débloquer
          </Button>
        ) : (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--brass-700)",
              fontStyle: "italic",
            }}
          >
            verrouillé
          </span>
        )}
      </div>
    </li>
  );
}
