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

/**
 * Ordre cyclique : Bibliothèque → Bureau → Stockage → Atelier → Collection → (boucle)
 *
 * Le panorama Atelier+Stockage est partagé : à gauche le stockage (porte verte
 * + étagère), au centre/droite l'atelier (établi sous fenêtre vitrail + retour
 * d'établi sur mur droit). On respecte cet ordre visuel dans la TabBar : en
 * sortant du Bureau par la droite on entre dans le Stockage (gauche du
 * panorama), puis on glisse vers l'Atelier (centre/droite du panorama).
 *
 * L'onglet actif est toujours rendu en position centrale (index 2). Les autres
 * sont placés autour selon leur offset cyclique. Le swipe horizontal sur le
 * contenu (cf. SwipePager) suit ce même ordre.
 */
export const TAB_ORDER: TabDef[] = [
  {
    icon: BookOpen,
    label: "Biblio.",
    path: "/bibliotheque",
    badge: (state) =>
      Object.values(state.competenceTrees).reduce(
        (s, t) => s + t.pointsDisponibles,
        0,
      ),
  },
  { icon: Home, label: "Bureau", path: "/bureau" },
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
];

const HIDDEN_EXACT = new Set(["/"]);
const HIDDEN_PREFIXES = ["/chiner/", "/vitrine/"];

/** Renvoie l'index dans TAB_ORDER de la route active, -1 si aucune ne matche. */
export function findActiveTabIndex(pathname: string): number {
  return TAB_ORDER.findIndex(
    (t) => pathname === t.path || pathname.startsWith(`${t.path}/`),
  );
}

/** Vrai si la TabBar doit être visible sur cette route. */
export function isTabBarRoute(pathname: string): boolean {
  if (HIDDEN_EXACT.has(pathname)) return false;
  for (const p of HIDDEN_PREFIXES) {
    if (pathname.startsWith(p)) return false;
  }
  return true;
}

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
  fontSize: "clamp(8px, 2.2vw, 10px)",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--brass-300)",
  padding: "4px 0",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  minWidth: 0,
  textAlign: "center",
};

const iconBox: CSSProperties = {
  position: "relative",
  width: "clamp(30px, 8vw, 38px)",
  height: "clamp(30px, 8vw, 38px)",
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
  if (!isTabBarRoute(pathname)) return null;

  const activeIdx = findActiveTabIndex(pathname);
  // Si aucune route ne matche (cas dégénéré), on retombe sur Bureau au centre.
  const center = activeIdx >= 0 ? activeIdx : 1;
  const N = TAB_ORDER.length;

  // Slot 0..4 → on remplit en partant du centre (slot 2 = actif).
  const slots = Array.from({ length: N }, (_, i) => {
    const offset = i - 2; // -2, -1, 0, +1, +2
    const idx = (center + offset + N) % N;
    return { tab: TAB_ORDER[idx], offset };
  });

  return (
    <nav aria-label="Navigation principale" style={wrapStyle}>
      {slots.map(({ tab, offset }) => {
        const Icon = tab.icon;
        const active = offset === 0;
        const count = tab.badge ? tab.badge(state) : 0;
        return (
          <button
            key={tab.path}
            type="button"
            aria-current={active ? "page" : undefined}
            aria-label={tab.label}
            onClick={() => {
              playClick();
              if (!active) {
                if (typeof navigator !== "undefined" && navigator.vibrate) {
                  navigator.vibrate(8);
                }
                router.push(tab.path);
              }
            }}
            style={{
              ...tabBtn,
              color: active ? "var(--brass-100)" : "var(--brass-300)",
            }}
          >
            <span
              data-fly-target={tab.path}
              style={{
                ...iconBox,
                background: active ? "var(--brass-500)" : "transparent",
              }}
            >
              <Icon
                size={20}
                strokeWidth={1.5}
                color={active ? "var(--forest-800)" : "var(--brass-300)"}
              />
              {count > 0 && (
                <span style={{ position: "absolute", top: -6, right: -6 }}>
                  <Badge count={count} />
                </span>
              )}
            </span>
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
