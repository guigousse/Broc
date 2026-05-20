"use client";

import { useRouter } from "next/navigation";
import {
  Album,
  Anvil,
  BookOpen,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties } from "react";
import { Badge } from "@/components/mobile/Badge";
import { getStockageTier } from "@/data/stockage";
import { progressionGlobale } from "@/lib/collection";
import type { GameState } from "@/types/game";

interface QgEtatDesLieuxProps {
  state: GameState;
}

interface Ligne {
  icon: LucideIcon;
  titre: string;
  meta: string;
  path: string;
  badge?: number;
}

const cardStyle: CSSProperties = {
  border: "1px solid var(--brass-500)",
  background: "var(--paper-100)",
  padding: "4px 12px",
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
};

const rowBtn: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "26px 1fr auto",
  alignItems: "center",
  gap: 10,
  padding: "8px 0",
  borderBottom: "1px dotted var(--paper-500)",
  background: "transparent",
  border: "none",
  width: "100%",
  cursor: "pointer",
  textAlign: "left",
};

export function QgEtatDesLieux({ state }: QgEtatDesLieuxProps) {
  const router = useRouter();
  const stockTier = getStockageTier(state.inventaireJoueur.length);
  const totalPoints = Object.values(state.competenceTrees).reduce(
    (s, t) => s + t.pointsDisponibles,
    0,
  );
  const prets = state.inventaireJoueur.filter(
    (o) =>
      o.enRestauration &&
      (o.enRestauration.jourFin ?? Infinity) <= state.jourActuel,
  ).length;
  const col = progressionGlobale(state.collection);

  const lignes: Ligne[] = [
    {
      icon: Warehouse,
      titre: "Stockage",
      meta: `${stockTier.nom} · ${state.inventaireJoueur.length} obj.`,
      path: "/stockage",
    },
    {
      icon: Anvil,
      titre: "Atelier",
      meta:
        prets > 0
          ? `${prets} prêt${prets > 1 ? "s" : ""} à récupérer`
          : "Établi libre",
      path: "/atelier",
      badge: prets,
    },
    {
      icon: BookOpen,
      titre: "Compétences",
      meta:
        totalPoints > 0
          ? `${totalPoints} pt${totalPoints > 1 ? "s" : ""} à dépenser`
          : `${state.competencesDebloquees.length} acquise${state.competencesDebloquees.length > 1 ? "s" : ""}`,
      path: "/competences",
      badge: totalPoints,
    },
    {
      icon: Album,
      titre: "Collection",
      meta: `${col.donnees} / ${col.total} · ${col.valeur.toLocaleString("fr-FR")} €`,
      path: "/collection",
    },
  ];

  return (
    <section aria-label="État des lieux" style={cardStyle}>
      {lignes.map((l, i) => {
        const Icon = l.icon;
        return (
          <button
            key={l.path}
            type="button"
            onClick={() => router.push(l.path)}
            style={{
              ...rowBtn,
              borderBottom:
                i === lignes.length - 1
                  ? "none"
                  : "1px dotted var(--paper-500)",
            }}
          >
            <span
              style={{
                width: 26,
                height: 26,
                display: "grid",
                placeItems: "center",
                border: "1px solid var(--brass-500)",
                color: "var(--brass-700)",
              }}
            >
              <Icon size={14} strokeWidth={1.5} />
            </span>
            <span>
              <span
                style={{
                  display: "block",
                  fontFamily: "var(--font-display)",
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--forest-800)",
                }}
              >
                {l.titre}
              </span>
              <span
                style={{
                  display: "block",
                  fontFamily: "var(--font-mono)",
                  fontSize: 9.5,
                  color: "var(--ink-500)",
                  marginTop: 1,
                }}
              >
                {l.meta}
              </span>
            </span>
            <span
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              {l.badge ? <Badge count={l.badge} /> : null}
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--brass-500)",
                  fontSize: 16,
                }}
              >
                ›
              </span>
            </span>
          </button>
        );
      })}
    </section>
  );
}
