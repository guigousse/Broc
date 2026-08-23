"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Album,
  BookOpen,
  Home,
  Lock,
  ScrollText,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { type CSSProperties } from "react";
import { Badge } from "@/components/mobile/Badge";
import { useGameActions, useGameStateOnly } from "@/context/GameContext";
import { useSettings } from "@/context/SettingsContext";
import { useLangue } from "@/lib/i18n/LangueContext";
import type { DictionnaireUI } from "@/lib/i18n/ui";
import { useToastSafe } from "@/components/ui/Toast";
import { estPret } from "@/lib/restauration";
import { missionsLivrables } from "@/lib/quetes/objectifs";
import { ongletTutorielPermis, tutorielActif } from "@/lib/tutoriel";
import type { GameState } from "@/types/game";

/** Clé d'onglet — sert à retrouver le libellé traduit dans `d.chrome.onglets`. */
type OngletCle = "quetes" | "collection" | "bibliotheque" | "bureau" | "reserve";

export interface TabDef {
  icon: LucideIcon;
  cle: OngletCle;
  /** Route ouverte au tap. Toujours le premier élément de `routes`. */
  path: string;
  /**
   * TOUS les chemins qui appartiennent à cet onglet. La Réserve en a deux
   * (`/stockage` et `/atelier`) : ce sont deux vraies routes rendant la même
   * coquille, et l'onglet doit se reconnaître actif sur les deux. Sans ça,
   * `findActiveTabIndex` renvoie -1 sur /atelier et le swipe entre pièces
   * ne sait plus d'où il part.
   */
  routes: string[];
  /** Libellé court pour la colonne étroite. À défaut, `d.chrome.onglets[cle]`. */
  abrege?: (d: DictionnaireUI) => string;
  /** `now` = temps de confiance (epoch ms) pour les badges dépendant du temps réel. */
  badge?: (state: GameState, now: number) => number;
  /**
   * Onboarding progressif. L'onglet reste TOUJOURS à sa place — grisé sous un
   * cadenas tant que `ouvert` est faux, et il dit `raison` quand on le touche.
   * Un trou dans la barre n'apprend rien au joueur ; un cadenas lui montre
   * qu'il y a quelque chose à gagner, et à quelle condition.
   */
  verrou?: {
    ouvert: (state: GameState) => boolean;
    raison: (d: DictionnaireUI) => string;
  };
}

/**
 * Ordre cyclique : Quêtes → Bibliothèque → Bureau → Réserve → Collection → (boucle)
 *
 * Le Bureau reste au centre. Seul lui est un panorama (3 zones swipables) ;
 * les autres onglets ouvrent directement leur écran.
 */
export const TAB_ORDER: TabDef[] = [
  {
    icon: ScrollText,
    cle: "quetes",
    path: "/quetes",
    routes: ["/quetes"],
    abrege: (d) => d.chrome.onglets.quetesAbrege,
    // Les pastilles de livrables ne vivent que dans le bureau : le badge
    // porte la même information partout ailleurs dans le jeu. Même source
    // que les pastilles — aucune règle dupliquée.
    badge: (state) => missionsLivrables(state).length,
  },
  {
    icon: BookOpen,
    cle: "bibliotheque",
    path: "/bibliotheque",
    routes: ["/bibliotheque"],
    abrege: (d) => d.chrome.onglets.bibliothequeAbrege,
    badge: (state) => state.brocanteur.pointsDisponibles,
    // L'écran Compétences s'ouvre au premier level-up (cf. deblocagesNiveau).
    // La navigation directe vers /bibliotheque à niveau 0 reste possible
    // (choix assumé, non bloqué) : le cadenas tient la barre, pas la route.
    verrou: {
      ouvert: (s) => s.brocanteur.niveau >= 1,
      raison: (d) => d.chrome.verrouBibliotheque,
    },
  },
  { icon: Home, cle: "bureau", path: "/bureau", routes: ["/bureau"] },
  {
    icon: Warehouse,
    cle: "reserve",
    path: "/stockage",
    routes: ["/stockage", "/atelier"],
    // Le badge des restaurations prêtes vivait sur l'onglet Atelier, qui
    // n'existe plus en bas : il remonte ici. La bande d'onglets haute le
    // redouble sur l'onglet Atelier (cf. ReserveTabs) pour dire laquelle des
    // deux moitiés appelle.
    badge: (state, now) =>
      state.inventaireJoueur.filter(
        (o) => o.enRestauration && estPret(o.enRestauration, now),
      ).length,
  },
  { icon: Album, cle: "collection", path: "/collection", routes: ["/collection"] },
];

/** Libellé abrégé affiché sous l'icône (colonne étroite) — cf. `d.chrome.onglets`. */
function libelleAbrege(tab: TabDef, d: DictionnaireUI): string {
  return tab.abrege ? tab.abrege(d) : d.chrome.onglets[tab.cle];
}

/** Libellé complet pour les lecteurs d'écran (aria-label), quand l'abrégé diffère. */
function libelleAria(tab: TabDef, d: DictionnaireUI): string {
  return d.chrome.onglets[tab.cle];
}

const HIDDEN_EXACT = new Set(["/", "/chiner", "/vitrine"]);

/**
 * Préfixes de routes de « session » (brocante en cours de chinage, vitrine en
 * cours de tenue) : la TabBar s'efface pendant ces écrans plein-écran, et
 * l'écran de level-up global (`LevelUpOverlay`) diffère aussi sa célébration
 * tant qu'on est dedans, pour ne pas interrompre l'action en cours.
 */
export const ROUTES_SESSION_PREFIXES = ["/chiner/", "/vitrine/"];

/**
 * Un onglet est-il encore fermé pour ce joueur ? `state` null
 * (pré-hydratation) n'en verrouille aucun, pour ne pas faire clignoter un
 * cadenas chez un joueur qui aura tout débloqué une fois hydraté. Exporté :
 * le swipe entre onglets (SwipePager) doit sauter les pièces fermées, sinon
 * le cadenas de la barre ne voudrait plus rien dire.
 */
export function ongletFerme(tab: TabDef, state: GameState | null): boolean {
  return !!state && !!tab.verrou && !tab.verrou.ouvert(state);
}

/**
 * Onglet suivant OUVERT dans le cycle, en partant de `idx` et en avançant de
 * `pas` (+1 vers la droite, −1 vers la gauche). Les pièces fermées sont
 * sautées : le swipe ne doit pas entrer par la fenêtre là où la barre montre
 * un cadenas. `null` si le tour complet ne trouve rien d'ouvert.
 */
export function ongletSuivantOuvert(
  idx: number,
  pas: 1 | -1,
  state: GameState | null,
): TabDef | null {
  const N = TAB_ORDER.length;
  for (let k = 1; k < N; k++) {
    const cible = TAB_ORDER[(((idx + pas * k) % N) + N) % N];
    if (!ongletFerme(cible, state)) return cible;
  }
  return null;
}

/** Renvoie l'index dans TAB_ORDER de la route active, -1 si aucune ne matche. */
export function findActiveTabIndex(pathname: string): number {
  return TAB_ORDER.findIndex((t) =>
    t.routes.some((r) => pathname === r || pathname.startsWith(`${r}/`)),
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
  minHeight: "var(--tap-min)",
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

/** Cadenas laiton posé par-dessus l'icône grisée de l'onglet fermé. */
const cadenasOverlay: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "grid",
  placeItems: "center",
  color: "var(--brass-300)",
  filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.85))",
  pointerEvents: "none",
};

export function TabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { state, isHydrated } = useGameStateOnly();
  const { tempsConfiance } = useGameActions();
  const { playClick } = useSettings();
  const { toast } = useToastSafe();
  const { d } = useLangue();

  if (!isHydrated) return null;
  if (!isTabBarRoute(pathname)) return null;
  // Tutoriel guidé : la barre reste VISIBLE dès le début (retour device
  // 2026-07-17) mais la navigation libre est coupée — taps inertes, la
  // bannière et les dialogues guident.
  const tutoEnCours = !!(state && tutorielActif(state));

  // Tutoriel guidé v2 (brocante scriptée) : certaines étapes autorisent un
  // seul onglet (Stockage, Collection, Bureau) — les autres restent inertes.
  // `null` = aucun onglet permis (comportement historique, ex. pendant la
  // chine ou une négociation en cours).
  const ongletPermis = state ? ongletTutorielPermis(state.tutorielEtape) : null;

  // Les cinq onglets sont TOUJOURS là (plus de masquage) : ceux qui ne sont
  // pas encore ouverts portent un cadenas. `state` null (pré-hydratation)
  // n'en verrouille aucun, pour ne pas faire clignoter un cadenas chez un
  // joueur qui, une fois hydraté, aura bien tout débloqué.
  const estVerrouille = (t: TabDef): boolean => ongletFerme(t, state);

  // Mini-tutos : main pointeuse au-dessus de l'onglet vers lequel guider —
  // Quêtes pour clore le tutoriel (le livre a quitté le bureau), Réserve
  // pour ranger le vinyle ou visiter l'Atelier fraîchement déverrouillé par
  // la première compétence Réparer, Bureau pour revenir au gramophone.
  // Le carnet passe AVANT l'Atelier et le Vinyle : la fin du tutoriel prime.
  // Jamais sur l'onglet déjà actif — et l'Atelier n'ayant plus sa propre
  // colonne (fusionné dans la Réserve), « déjà actif » couvre ses deux
  // routes (`/atelier` et `/stockage`).
  const mainMiniTuto = (tabPath: string): boolean => {
    if (state?.miniTutoCarnet === "ouvrir") {
      return tabPath === "/quetes" && pathname !== "/quetes";
    }
    if (state?.miniTutoAtelier === "visite") {
      return tabPath === "/stockage" && pathname !== "/atelier" && pathname !== "/stockage";
    }
    const mt = state?.miniTutoVinyle;
    if (mt === "ajouter") return tabPath === "/stockage" && pathname !== "/stockage";
    if (mt === "ecouter") return tabPath === "/bureau" && pathname !== "/bureau";
    return false;
  };

  // Main de guidage généralisée : celle du tutoriel scripté (ongletPermis)
  // prend le relais de mainMiniTuto — jamais sur l'onglet déjà actif.
  const mainTuto = (tabPath: string): boolean => {
    if (ongletPermis && tabPath === ongletPermis && pathname !== ongletPermis) {
      return true;
    }
    return mainMiniTuto(tabPath);
  };

  // Une main est-elle affichée ? La fenêtre flottante du stockage (zIndex 35)
  // passerait sinon devant la main qui déborde au-dessus de la nav (zIndex 30).
  const mainAffichee = TAB_ORDER.some((t) => mainTuto(t.path));

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
        ...(mainAffichee ? { zIndex: 40 } : null),
        gridTemplateColumns: `repeat(${TAB_ORDER.length}, 1fr)`,
      }}
    >
      {TAB_ORDER.map((tab) => {
        const Icon = tab.icon;
        const active = tab === activeTab;
        const verrouille = estVerrouille(tab);
        // Aucun badge sous un cadenas : le compteur de points de compétence
        // clignoterait derrière une porte fermée.
        const count = state && tab.badge && !verrouille ? tab.badge(state, now) : 0;
        return (
          <button
            key={tab.path}
            type="button"
            aria-current={active ? "page" : undefined}
            aria-disabled={verrouille || undefined}
            aria-label={
              verrouille
                ? `${libelleAria(tab, d)} — ${d.chrome.ongletVerrouille}`
                : libelleAria(tab, d)
            }
            className={mainTuto(tab.path) ? "tuto-main tuto-main-haut" : undefined}
            onClick={() => {
              if (tutoEnCours && tab.path !== ongletPermis) return;
              if (verrouille) {
                // Le cadenas répond : il dit à quelle condition il s'ouvre.
                // Ni navigation ni vibration — rien ne s'est passé, sauf la
                // réponse.
                playClick();
                toast(tab.verrou!.raison(d), { type: "info" });
                return;
              }
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
              opacity: verrouille ? 0.55 : 1,
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
                style={verrouille ? { filter: "grayscale(1)" } : undefined}
              />
              {verrouille && (
                <span style={cadenasOverlay}>
                  <Lock size={14} strokeWidth={2.6} />
                </span>
              )}
              {count > 0 && (
                <span style={{ position: "absolute", top: -6, right: -6 }}>
                  <Badge count={count} />
                </span>
              )}
            </span>
            <span style={tabLabel}>{libelleAbrege(tab, d)}</span>
          </button>
        );
      })}
    </nav>
  );
}
