"use client";

import { Lock } from "lucide-react";

import { FloatingActionBar } from "@/components/mobile/qg/FloatingActionBar";
import { FloatingActionButton } from "@/components/mobile/qg/FloatingActionButton";
import { useLangue } from "@/lib/i18n/LangueContext";

interface PorteSheetProps {
  open: boolean;
  onClose: () => void;
  vitrineActive: boolean;
  onChiner: () => void;
  onVitrine: () => void;
  /** Si vrai, le chinage est bloqué (stockage plein) : bouton grisé + avertissement. */
  chinerDesactive?: boolean;
  /** Tutoriel : force le choix Chiner (pulse) et désactive Étaler. */
  tutoChiner?: boolean;
  /** Tutoriel : force le choix Étaler (pulse) et désactive Chiner. */
  tutoEtaler?: boolean;
  /** Le Bazar a ouvert (jour 20). Fermé, son bouton reste visible mais cadenassé. */
  bazarOuvert: boolean;
  /** Jours de jeu avant l'ouverture, pour le « J-{n} ». Ignoré si `bazarOuvert`. */
  joursAvantBazar: number;
  onBazar: () => void;
}

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
        <span
          className={tutoChiner ? "tuto-pulse tuto-main tuto-main-haut" : undefined}
          style={{ display: "inline-block", borderRadius: 12 }}
        >
          <FloatingActionButton
            onClick={onChiner}
            disabled={chinerDesactive || tutoEtaler}
            minWidth={140}
          >
            {d.qg.chiner}
          </FloatingActionButton>
        </span>
      </div>
      <span
        className={tutoEtaler ? "tuto-pulse tuto-main tuto-main-haut" : undefined}
        style={{ display: "inline-block", borderRadius: 12 }}
      >
        <FloatingActionButton
          onClick={onVitrine}
          variant="secondary"
          disabled={tutoChiner}
          minWidth={140}
        >
          {d.qg.etaler}
        </FloatingActionButton>
      </span>
      {/* Le Bazar se voit dès le premier jour : fermé, il porte un cadenas et
          son compte à rebours. Le verrou du tutoriel grise le bouton lui aussi,
          mais SANS cadenas — le cadenas ne dit que la fermeture calendaire. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
        }}
      >
        {!bazarOuvert && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--brass-300)",
              // Le panorama derrière la barre peut être clair : sans ombre, le
              // laiton s'y noie (piège déjà payé sur les étiquettes de l'étal).
              textShadow: "0 1px 2px rgba(0,0,0,0.75)",
              whiteSpace: "nowrap",
            }}
          >
            {tr(d.qg.bazarCompteARebours, { n: joursAvantBazar })}
          </span>
        )}
        <FloatingActionButton
          onClick={onBazar}
          variant="secondary"
          disabled={!bazarOuvert || tutoChiner || tutoEtaler}
          minWidth={140}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {!bazarOuvert && (
              <Lock
                data-testid="bazar-cadenas"
                size={13}
                strokeWidth={2}
                aria-hidden
              />
            )}
            {d.qg.bazar}
          </span>
        </FloatingActionButton>
      </div>
    </FloatingActionBar>
  );
}
