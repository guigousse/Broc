"use client";

import { FloatingActionBar } from "@/components/mobile/qg/FloatingActionBar";
import { FloatingActionButton } from "@/components/mobile/qg/FloatingActionButton";
import { useLangue } from "@/lib/i18n/LangueContext";

interface PorteBazarSheetProps {
  open: boolean;
  onClose: () => void;
  onChiner: () => void;
  onEtaler: () => void;
  onBureau: () => void;
  /** Si vrai, le chinage est bloqué (stockage plein) : bouton grisé + avertissement. */
  chinerDesactive?: boolean;
}

/**
 * La porte du Bazar, et ses trois sorties.
 *
 * Elle ramenait droit au bureau. Elle propose désormais les mêmes choix que
 * la porte du bureau — chiner, étaler, rentrer — pour qu'un joueur qui sort
 * de la boutique aille où il veut sans repasser par chez lui.
 *
 * C'est une SŒUR de `PorteSheet` et non sa réutilisation. Les deux portes
 * offrent Chiner et Étaler dans les mêmes termes, mais la troisième sortie
 * diffère (le Bazar là-bas, le bureau ici), et surtout `PorteSheet` porte le
 * câblage du tutoriel — pulses, verrous, cadenas calendaire — dont la porte
 * du Bazar n'a que faire : le tutoriel est fini bien avant le J+20. Faire
 * entrer cette porte-ci dans ce composant-là lui aurait fait hériter d'un
 * état qu'elle ne peut pas atteindre.
 *
 * Ce qui compte, en revanche, ne se duplique pas : la RÈGLE qui décide où
 * mène chaque bouton — reprise d'une journée commencée, jauge d'énergie —
 * vit dans `lib/porte`, appelée par les deux.
 */
export function PorteBazarSheet({
  open,
  onClose,
  onChiner,
  onEtaler,
  onBureau,
  chinerDesactive = false,
}: PorteBazarSheetProps) {
  const { d } = useLangue();
  return (
    <FloatingActionBar open={open} onClose={onClose}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
        }}
      >
        {/* Sans ce mot, un bouton mort n'est qu'une panne. */}
        {chinerDesactive && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--vermillion-500)",
              whiteSpace: "nowrap",
            }}
          >
            {d.qg.stockagePlein}
          </span>
        )}
        <FloatingActionButton onClick={onChiner} disabled={chinerDesactive} minWidth={140}>
          {d.qg.chiner}
        </FloatingActionButton>
      </div>
      <FloatingActionButton onClick={onEtaler} variant="secondary" minWidth={140}>
        {d.qg.etaler}
      </FloatingActionButton>
      <FloatingActionButton onClick={onBureau} variant="secondary" minWidth={140}>
        {d.chrome.onglets.bureau}
      </FloatingActionButton>
    </FloatingActionBar>
  );
}
