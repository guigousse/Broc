"use client";

import type { CSSProperties } from "react";

import { FloatingActionBar } from "@/components/mobile/qg/FloatingActionBar";
import { BoutonPorteRond } from "@/components/mobile/qg/BoutonPorteRond";
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
 * Les trois sorties, en médaillons : la paire chiner/étaler en bas, la
 * destination du jour au-dessus. C'est la disposition des deux portes du jeu —
 * les deux gestes du métier côte à côte, et le lieu où l'on va au-dessus
 * d'eux.
 */
export const PILE_PORTE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 14,
};

export const PAIRE_PORTE: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  gap: 14,
};

/** Le mot rouge du stockage plein, au-dessus du médaillon qu'il condamne. */
export const AVERTISSEMENT_PORTE: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--vermillion-500)",
  whiteSpace: "nowrap",
  textShadow: "0 1px 2px rgba(0,0,0,0.75)",
};

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
 * vit dans `lib/porte`, appelée par les deux ; et le médaillon lui-même est
 * le composant partagé `BoutonPorteRond`.
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
      <div style={PILE_PORTE}>
        <BoutonPorteRond
          libelle={d.chrome.onglets.bureau}
          image="/ui/portes/bureau.webp"
          onClick={onBureau}
        />
        <div style={PAIRE_PORTE}>
          <div style={PILE_PORTE}>
            {/* Sans ce mot, un bouton mort n'est qu'une panne. */}
            {chinerDesactive && <span style={AVERTISSEMENT_PORTE}>{d.qg.stockagePlein}</span>}
            <BoutonPorteRond
              libelle={d.qg.chiner}
              image="/ui/portes/chiner.webp"
              onClick={onChiner}
              disabled={chinerDesactive}
            />
          </div>
          <BoutonPorteRond
            libelle={d.qg.etaler}
            image="/ui/portes/etaler.webp"
            onClick={onEtaler}
          />
        </div>
      </div>
    </FloatingActionBar>
  );
}
