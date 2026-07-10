"use client";

import { usePathname, useRouter } from "next/navigation";
import { Album, Anvil, BookOpen, Home, Warehouse, type LucideIcon } from "lucide-react";
import { type CSSProperties } from "react";
import { Badge } from "@/components/mobile/Badge";
import { useGameActions, useGameStateOnly } from "@/context/GameContext";
import { useSettings } from "@/context/SettingsContext";
import { useLangue } from "@/lib/i18n/LangueContext";
import type { DictionnaireUI } from "@/lib/i18n/ui";
import { estPret } from "@/lib/restauration";
import type { GameState } from "@/types/game";

/** Clé d'onglet — sert à retrouver le libellé traduit dans `d.chrome.onglets`. */
type OngletCle = "collection" | "bibliotheque" | "bureau" | "stockage" | "atelier";

interface TabDef {
  icon: LucideIcon;
  cle: OngletCle;
  path: string;
  /** `now` = temps de confiance (epoch ms) pour les badges dépendant du temps réel. */
  badge?: (state: GameState, now: number) => number;
  /** Onglet masqué tant que la condition est vraie (onboarding progressif). */
  masque?: (state: GameState) => boolean;
}

/**
 * Ordre cyclique : Collection → Bibliothèque → Bureau → Stockage → Atelier → (boucle)
 *
 * Seul le Bureau est un panorama (3 zones swipables). Les autres onglets
 * ouvrent directement leur écran de gestion.
 */
export const TAB_ORDER: TabDef[] = [
  { icon: Album, cle: "collection", path: "/collection" },
  {
    icon: BookOpen,
    cle: "bibliotheque",
    path: "/bibliotheque",
    badge: (state) => state.brocanteur.pointsDisponibles,
    // Masqué avant le premier level-up : l'écran Compétences s'ouvre au
    // niveau 1 (cf. deblocagesNiveau). La navigation directe vers
    // /bibliotheque à niveau 0 reste possible (choix assumé, non bloqué).
    masque: (s) => s.brocanteur.niveau < 1,
  },
  { icon: Home, cle: "bureau", path: "/bureau" },
  { icon: Warehouse, cle: "stockage", path: "/stockage" },
  {
    icon: Anvil,
    cle: "atelier",
    path: "/atelier",
    badge: (state, now) =>
      state.inventaireJoueur.filter(
        (o) => o.enRestauration && estPret(o.enRestauration, now),
      ).length,
  },
];

/** Libellé abrégé affiché sous l'icône (colonne étroite) — cf. `d.chrome.onglets`. */
function libelleAbrege(cle: OngletCle, d: DictionnaireUI): string {
  return cle === "bibliotheque"
    ? d.chrome.onglets.bibliothequeAbrege
    : d.chrome.onglets[cle];
}

/** Libellé complet pour les lecteurs d'écran (aria-label), quand l'abrégé diffère. */
function libelleAria(cle: OngletCle, d: DictionnaireUI): string {
  return cle === "bibliotheque" ? d.chrome.onglets.bibliotheque : d.chrome.onglets[cle];
}

const HIDDEN_EXACT = new Set(["/", "/chiner", "/vitrine"]);

/**
 * Préfixes de routes de « session » (brocante en cours de chinage, vitrine en
 * cours de tenue) : la TabBar s'efface pendant ces écrans plein-écran, et
 * l'écran de level-up global (`LevelUpOverlay`) diffère aussi sa célébration
 * tant qu'on est dedans, pour ne pas interrompre l'action en cours.
 */
export const ROUTES_SESSION_PREFIXES = ["/chiner/", "/vitrine/"];

/** Renvoie l'index dans TAB_ORDER de la route active, -1 si aucune ne matche. */
export function findActiveTabIndex(pathname: string): number {
  return TAB_ORDER.findIndex(
    (t) => pathname === t.path || pathname.startsWith(`${t.path}/`),
  );
}

/** Vrai si la TabBar doit être visible sur cette route. */
export function isTabBarRoute(pathname: string): boolean {
  if (HIDDEN_EXACT.has(pathname)) return false;
  for (const p of ROUTES_SESSION_PREFIXES) {
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
  const { d } = useLangue();

  if (!isHydrated) return null;
  if (!isTabBarRoute(pathname)) return null;

  // Onglets masqués (onboarding progressif) : filtrés selon l'état courant.
  // `state` null (pré-hydratation du state du jeu) → aucun masque appliqué,
  // pour ne pas faire clignoter la disparition d'un onglet chez un joueur
  // qui, une fois hydraté, l'aura bien débloqué.
  const visibleTabs = TAB_ORDER.filter((t) => !state || !t.masque?.(state));

  const activeIdx = findActiveTabIndex(pathname);
  const activeTab = activeIdx >= 0 ? TAB_ORDER[activeIdx] : null;
  const now = tempsConfiance() ?? Date.now();

  // Ordre stable : pas de shuffle. L'onglet actif est simplement
  // surligné — moins de mouvement visuel quand on change de section.
  // La grille s'adapte au nombre d'onglets visibles (4 ou 5) automatiquement.
  return (
    <nav
      aria-label={d.chrome.navigationPrincipale}
      style={{
        ...wrapStyle,
        gridTemplateColumns: `repeat(${visibleTabs.length}, 1fr)`,
      }}
    >
      {visibleTabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab === activeTab;
        const count = state && tab.badge ? tab.badge(state, now) : 0;
        return (
          <button
            key={tab.path}
            type="button"
            aria-current={active ? "page" : undefined}
            aria-label={libelleAria(tab.cle, d)}
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
            <span style={tabLabel}>{libelleAbrege(tab.cle, d)}</span>
          </button>
        );
      })}
    </nav>
  );
}
