"use client";

import { usePathname, useRouter } from "next/navigation";
import { Album, Anvil, BookOpen, Home, Warehouse, type LucideIcon } from "lucide-react";
import { useSyncExternalStore, type CSSProperties } from "react";
import { Badge } from "@/components/mobile/Badge";
import { useGameActions, useGameStateOnly } from "@/context/GameContext";
import { useSettings } from "@/context/SettingsContext";
import {
  panoramaActiveStore,
  panoramaActiveServerSnapshot,
} from "@/lib/panoramaActiveStore";
import { estPret } from "@/lib/restauration";
import type { GameState } from "@/types/game";

interface TabDef {
  icon: LucideIcon;
  label: string;
  /** Libellé complet pour les lecteurs d'écran quand `label` est abrégé. */
  ariaLabel?: string;
  path: string;
  /** `now` = temps de confiance (epoch ms) pour les badges dépendant du temps réel. */
  badge?: (state: GameState, now: number) => number;
}

/**
 * Ordre cyclique : Collection → Bibliothèque → Bureau → Stockage → Atelier → (boucle)
 *
 * Le panorama Atelier+Stockage est partagé : à gauche le stockage (porte verte
 * + étagère), au centre/droite l'atelier (établi sous fenêtre vitrail + retour
 * d'établi sur mur droit). On respecte cet ordre visuel dans la TabBar : en
 * sortant du Bureau par la droite on entre dans le Stockage (gauche du
 * panorama), puis on glisse vers l'Atelier (centre/droite du panorama).
 *
 * Le swipe horizontal sur le contenu (cf. SwipePager) suit ce même ordre.
 */
export const TAB_ORDER: TabDef[] = [
  { icon: Album, label: "Collection", path: "/collection" },
  {
    icon: BookOpen,
    label: "Biblio.",
    ariaLabel: "Bibliothèque",
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
    badge: (state, now) =>
      state.inventaireJoueur.filter(
        (o) => o.enRestauration && estPret(o.enRestauration, now),
      ).length,
  },
];

const HIDDEN_EXACT = new Set(["/", "/chiner", "/vitrine"]);
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
  justifyContent: "center",
  gap: 2,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontFamily: "var(--font-mono)",
  fontSize: "clamp(10px, 2.6vw, 12px)",
  lineHeight: 1.1,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--brass-300)",
  padding: "2px 0",
  minWidth: 0,
  textAlign: "center",
};

const tabLabel: CSSProperties = {
  display: "block",
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const iconBox: CSSProperties = {
  position: "relative",
  width: "clamp(26px, 7vw, 34px)",
  height: "clamp(26px, 7vw, 34px)",
  display: "grid",
  placeItems: "center",
  border: "1px solid var(--brass-500)",
  background: "transparent",
};

export function TabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { state, isHydrated } = useGameStateOnly();
  const { tempsConfiance } = useGameActions();
  const { playClick } = useSettings();

  // Override "live" : quand on est dans le panorama unifié, le store
  // émet l'onglet visé par le scroll EN TEMPS RÉEL. Permet à la TabBar
  // de surligner la bonne entrée avant même que l'URL ne soit poussée
  // par le débounce 350 ms.
  const liveTab = useSyncExternalStore(
    panoramaActiveStore.subscribe,
    panoramaActiveStore.get,
    panoramaActiveServerSnapshot,
  );

  if (!isHydrated || !state) return null;
  if (!isTabBarRoute(pathname)) return null;

  const liveTabPath =
    liveTab === "bureau"
      ? "/bureau"
      : liveTab === "stockage"
        ? "/stockage"
        : liveTab === "atelier"
          ? "/atelier"
          : null;
  const effectivePath = liveTabPath ?? pathname;
  const activeIdx = findActiveTabIndex(effectivePath);
  const now = tempsConfiance() ?? Date.now();

  // Ordre stable : pas de shuffle. L'onglet actif est simplement
  // surligné — moins de mouvement visuel quand on change de section.
  return (
    <nav aria-label="Navigation principale" style={wrapStyle}>
      {TAB_ORDER.map((tab, idx) => {
        const Icon = tab.icon;
        const active = idx === activeIdx;
        const count = tab.badge ? tab.badge(state, now) : 0;
        return (
          <button
            key={tab.path}
            type="button"
            aria-current={active ? "page" : undefined}
            aria-label={tab.ariaLabel ?? tab.label}
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
            <span style={tabLabel}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
