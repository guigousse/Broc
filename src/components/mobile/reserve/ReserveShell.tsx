"use client";

/**
 * Coquille commune aux deux onglets de la Réserve.
 *
 * `/stockage` et `/atelier` restent DEUX vraies routes — sept mécanismes du
 * jeu les désignent par leur chemin (chrome global, ambiance sonore, vol des
 * objets, onglet permis par le tutoriel, fermeture des sheets, deep-link
 * `?cat=`, notification de restauration) et continuent de fonctionner sans
 * être touchés. Basculer d'onglet fait donc un vrai `router.replace()`, et
 * React démonte la page.
 *
 * D'où la mémoire de module ci-dessous : elle retient la dernière pièce de la
 * Réserve montée, pour savoir si l'on arrive de l'onglet frère (et sauter le
 * glissement d'entrée) ou d'ailleurs dans le jeu (et le jouer).
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { FloatingRoomOverlay } from "@/components/mobile/floating-room/FloatingRoomOverlay";
import { ReserveTabs, type OngletReserve } from "./ReserveTabs";

/** Dernier onglet de la Réserve monté, ou null si l'on n'y est plus. */
let dernierOngletMonte: OngletReserve | null = null;

/**
 * Compteur monotone, incrémenté à CHAQUE setup d'effet — réel ou fantôme
 * (React StrictMode, actif par défaut en dev sur cette app, double-invoque
 * les effets au montage : setup → cleanup → setup, tout synchrone). Un
 * cleanup différé ne peut pas se fier à une comparaison par VALEUR d'onglet
 * pour savoir s'il doit annuler la mémoire : quand le montage fantôme et le
 * montage réel portent le même onglet, cette comparaison ne les distingue
 * pas et efface à tort la mémoire d'une instance toujours montée. Chaque
 * cleanup capture donc SA génération et n'annule la mémoire que si aucun
 * nouveau setup n'a eu lieu depuis.
 */
let generationMemoire = 0;

/** Réservé aux tests : remet la mémoire à zéro entre deux cas. */
export function __resetMemoireReserve(): void {
  dernierOngletMonte = null;
  generationMemoire = 0;
}

const ROUTE_ONGLET: Record<OngletReserve, string> = {
  stockage: "/stockage",
  atelier: "/atelier",
};

interface ReserveShellProps {
  onglet: OngletReserve;
  atelierOuvert: boolean;
  badgeAtelier: number;
  /** Appelé au tap sur l'onglet Atelier cadenassé (le parent toaste). */
  onVerrou: () => void;
  bande: ReactNode;
  milieu?: ReactNode;
  children: ReactNode;
}

export function ReserveShell({
  onglet,
  atelierOuvert,
  badgeAtelier,
  onVerrou,
  bande,
  milieu,
  children,
}: ReserveShellProps) {
  const router = useRouter();
  // Décidé UNE fois au premier rendu : un re-rendu ne doit pas rallumer
  // l'animation au milieu de la vie du composant.
  const [animer] = useState(() => dernierOngletMonte === null);
  const ongletRef = useRef(onglet);
  ongletRef.current = onglet;

  useEffect(() => {
    dernierOngletMonte = ongletRef.current;
    generationMemoire += 1;
    const maGeneration = generationMemoire;
    return () => {
      // Le démontage peut être un passage à l'onglet frère (on garde la
      // mémoire), une sortie de la Réserve, ou un cleanup fantôme de
      // StrictMode immédiatement suivi d'un remontage. On ne peut pas le
      // savoir ici : c'est le montage suivant qui tranche. Comparer
      // seulement la VALEUR de l'onglet ne suffit pas — un remontage fantôme
      // porte souvent le même onglet que celui qui vient de se démonter —
      // d'où la génération : si un nouveau setup a eu lieu depuis celui-ci
      // (réel ou fantôme), on n'annule rien.
      const parti = ongletRef.current;
      queueMicrotask(() => {
        if (dernierOngletMonte === parti && generationMemoire === maGeneration) {
          dernierOngletMonte = null;
        }
      });
    };
  }, []);

  return (
    <FloatingRoomOverlay
      animer={animer}
      bande={
        <>
          <ReserveTabs
            actif={onglet}
            atelierOuvert={atelierOuvert}
            badgeAtelier={badgeAtelier}
            onChoisir={(o) => router.replace(ROUTE_ONGLET[o])}
            onVerrou={onVerrou}
          />
          {bande}
        </>
      }
      milieu={milieu}
    >
      {children}
    </FloatingRoomOverlay>
  );
}
