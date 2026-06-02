"use client";

import { usePathname, useRouter } from "next/navigation";
import { Album, Anvil, BookOpen, Home, Warehouse, type LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { Badge } from "@/components/mobile/Badge";
import { useGame } from "@/context/GameContext";
import { useSettings } from "@/context/SettingsContext";
import type { GameState } from "@/types/game";

interface TabDef {
  icon: LucideIcon;
  label: string;
  path: string;
  badge?: (state: GameState) => number;
}

const tabs: TabDef[] = [
  { icon: Home, label: "QG", path: "/qg" },
  { icon: Warehouse, label: "Stockage", path: "/stockage" },
  {
    icon: Anvil,
    label: "Atelier",
    path: "/atelier",
    badge: (state) =>
      state.inventaireJoueur.filter(
        (o) =>
          o.enRestauration &&
          (o.enRestauration.jourFin ?? Infinity) <= state.jourActuel,
      ).length,
  },
  { icon: Album, label: "Collection", path: "/collection" },
  {
    icon: BookOpen,
    label: "Compét.",
    path: "/competences",
    badge: (state) =>
      Object.values(state.competenceTrees).reduce(
        (s, t) => s + t.pointsDisponibles,
        0,
      ),
  },
];

/** Routes sur lesquelles la tab bar est masquée (sessions plein écran). */
const HIDDEN_EXACT = new Set(["/"]);
const HIDDEN_PREFIXES = ["/chiner/", "/vitrine/"];

const wrapStyle: CSSProperties = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 30,
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  borderTop: "3px solid var(--brass-500)",
  background: "var(--forest-800)",
  padding: "6px 4px",
  paddingBottom: "calc(6px + var(--safe-bottom))",
  height: "calc(var(--mobile-tabbar-h) + var(--safe-bottom))",
  boxSizing: "border-box",
};

const tabBtn: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 3,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--brass-300)",
  padding: "4px 0",
};

const iconBox: CSSProperties = {
  position: "relative",
  width: 32,
  height: 32,
  display: "grid",
  placeItems: "center",
  border: "1px solid var(--brass-500)",
  background: "transparent",
};

export function TabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { state, isHydrated } = useGame();
  const { playClick } = useSettings();

  if (!isHydrated || !state) return null;
  if (HIDDEN_EXACT.has(pathname)) return null;
  for (const p of HIDDEN_PREFIXES) {
    if (pathname.startsWith(p)) return null;
  }

  return (
    <nav aria-label="Navigation principale" style={wrapStyle}>
      {tabs.map((t) => {
        const Icon = t.icon;
        const active =
          pathname === t.path || pathname.startsWith(`${t.path}/`);
        const count = t.badge ? t.badge(state) : 0;
        return (
          <button
            key={t.path}
            type="button"
            onClick={() => {
              playClick();
              router.push(t.path);
            }}
            style={{
              ...tabBtn,
              color: active ? "var(--brass-100)" : "var(--brass-300)",
            }}
          >
            <span
              data-fly-target={t.path}
              style={{
                ...iconBox,
                background: active ? "var(--brass-500)" : "transparent",
              }}
            >
              <Icon
                size={18}
                strokeWidth={1.5}
                color={active ? "var(--forest-800)" : "var(--brass-300)"}
              />
              {count > 0 && (
                <span style={{ position: "absolute", top: -6, right: -6 }}>
                  <Badge count={count} />
                </span>
              )}
            </span>
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
