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

/** Réservé aux tests : remet la mémoire à zéro entre deux cas. */
export function __resetMemoireReserve(): void {
  dernierOngletMonte = null;
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
    return () => {
      // Le démontage peut être un passage à l'onglet frère (on garde la
      // mémoire) ou une sortie de la Réserve. On ne peut pas le savoir ici :
      // c'est le montage suivant qui tranche, en écrasant la valeur. La
      // sortie est traitée par le nettoyage différé ci-dessous.
      const parti = ongletRef.current;
      queueMicrotask(() => {
        if (dernierOngletMonte === parti) dernierOngletMonte = null;
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
