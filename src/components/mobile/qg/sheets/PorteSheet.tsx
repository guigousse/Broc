"use client";

import { FloatingActionBar } from "@/components/mobile/qg/FloatingActionBar";
import { BoutonPorteRond } from "@/components/mobile/qg/BoutonPorteRond";
import {
  AVERTISSEMENT_PORTE,
  PAIRE_PORTE,
  PILE_PORTE,
} from "@/components/bazar/PorteBazarSheet";
import { useLangue } from "@/lib/i18n/LangueContext";

interface PorteSheetProps {
  open: boolean;
  onClose: () => void;
  onChiner: () => void;
  onVitrine: () => void;
  /** Si vrai, le chinage est bloqué (stockage plein) : bouton grisé + avertissement. */
  chinerDesactive?: boolean;
  /** Tutoriel : force le choix Chiner (pulse) et désactive Étaler. */
  tutoChiner?: boolean;
  /** Tutoriel : force le choix Étaler (pulse) et désactive Chiner. */
  tutoEtaler?: boolean;
  /** Le Bazar a ouvert (jour 20). Fermé, son médaillon reste visible mais cadenassé. */
  bazarOuvert: boolean;
  /** Jours de jeu avant l'ouverture, pour le « J-{n} ». Ignoré si `bazarOuvert`. */
  joursAvantBazar: number;
  onBazar: () => void;
}

/**
 * La porte du bureau, et ses trois sorties, en médaillons.
 *
 * La disposition est celle des deux portes du jeu : les deux gestes du métier
 * côte à côte en bas, le lieu où l'on va au-dessus d'eux — le Bazar ici, le
 * bureau depuis le Bazar.
 *
 * Le pulse du tutoriel est posé sur le MÉDAILLON et non sur une enveloppe :
 * il portait un `borderRadius: 12` qui dessinait un halo carré autour de ce
 * qui est désormais un rond.
 */
export function PorteSheet({
  open,
  onClose,
  onChiner,
  onVitrine,
  chinerDesactive = false,
  tutoChiner = false,
  tutoEtaler = false,
  bazarOuvert,
  joursAvantBazar,
  onBazar,
}: PorteSheetProps) {
  const { d, tr } = useLangue();
  const pulse = "tuto-pulse tuto-main tuto-main-haut";
  return (
    <FloatingActionBar open={open} onClose={onClose}>
      <div style={PILE_PORTE}>
        {/* Le Bazar se voit dès le premier jour : fermé, son médaillon
            s'éteint, porte un cadenas et son compte à rebours. Le verrou du
            tutoriel grise le bouton lui aussi, mais SANS cadenas — le cadenas
            ne dit que la fermeture calendaire. */}
        <BoutonPorteRond
          libelle={d.qg.bazar}
          image="/ui/portes/bazar.webp"
          onClick={onBazar}
          disabled={!bazarOuvert || tutoChiner || tutoEtaler}
          cadenasse={!bazarOuvert}
          compteARebours={tr(d.qg.bazarCompteARebours, { n: joursAvantBazar })}
        />
        <div style={PAIRE_PORTE}>
          <div style={PILE_PORTE}>
            {chinerDesactive && <span style={AVERTISSEMENT_PORTE}>{d.qg.stockagePlein}</span>}
            <BoutonPorteRond
              libelle={d.qg.chiner}
              image="/ui/portes/chiner.webp"
              onClick={onChiner}
              disabled={chinerDesactive || tutoEtaler}
              className={tutoChiner ? pulse : undefined}
            />
          </div>
          <BoutonPorteRond
            libelle={d.qg.etaler}
            image="/ui/portes/etaler.webp"
            onClick={onVitrine}
            disabled={tutoChiner}
            className={tutoEtaler ? pulse : undefined}
          />
        </div>
      </div>
    </FloatingActionBar>
  );
}
