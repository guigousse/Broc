"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ItemSticker } from "@/components/ui/ItemSticker";
import { StarRow } from "@/components/ui/StarRow";
import { etoileCount, estPristin } from "@/lib/etat";
import { getRarityColors } from "@/lib/rarityColors";
import { getTemplate } from "@/data/objetTemplates";
import { getItemImageUrl } from "@/lib/itemImages";
import { flyToTab } from "@/lib/flyAnimation";
import { audioManager } from "@/lib/audio/audioManager";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleEtat } from "@/lib/i18n/libelles";
import { nomObjet } from "@/lib/i18n/contenu";
import type { EtatObjet, Objet } from "@/types/game";

/**
 * Cérémonie de récupération d'un objet restauré.
 *
 * L'objet sort de l'établi en grand, sous les étoiles de son ANCIEN état ;
 * l'étoile gagnée apparaît ensuite, et s'il atteint le pristin, l'éclat et le
 * son victorieux avec elle. Après une courte pause l'objet rétrécit vers
 * l'onglet Stockage. Un tap n'importe où saute au vol.
 *
 * L'état du jeu ne dépend JAMAIS de cette séquence : l'appelant a déjà
 * crédité la récupération quand il monte ce composant. Fermer l'app au milieu
 * de l'animation ne perd rien — il ne reste ici qu'une image.
 */

/** Repères de la séquence, en ms depuis le montage (`dureeVol` = durée du vol). */
export const SEQUENCE_MS = {
  etoiles: 350,
  gagne: 750,
  vol: 1900,
  dureeVol: 620,
} as const;

type Phase = 0 | 1 | 2 | 3; // objet · étoiles d'avant · étoile gagnée · vol

interface CelebrationRestaurationProps {
  /** L'objet AVANT récupération (c'est `objet.etat` qui porte l'ancien état). */
  objet: Objet;
  /** L'état atteint par la restauration. */
  etatApres: EtatObjet;
  /** Fin de la cérémonie : l'appelant démonte le composant. */
  onTermine: () => void;
}

const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 70,
  display: "grid",
  placeItems: "center",
  background: "rgba(14, 11, 6, 0.82)",
  backdropFilter: "blur(3px)",
  cursor: "pointer",
};

const colonne: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 18,
  transition: "opacity 180ms ease-out",
};

const CADRE = 200;

const cadreObjet: CSSProperties = {
  position: "relative",
  width: CADRE,
  height: CADRE,
  display: "grid",
  placeItems: "center",
  animation: "broc-bilan-pop 420ms cubic-bezier(0.2, 0.9, 0.3, 1.2) both",
};

/** Halo ambré du pristin — même vocabulaire que l'aura de la boîte mystère. */
const auraPristin: CSSProperties = {
  position: "absolute",
  inset: "-14%",
  borderRadius: "50%",
  pointerEvents: "none",
  background:
    "radial-gradient(circle, rgba(255,205,110,0.55) 0%, rgba(255,190,70,0.22) 45%, rgba(255,190,70,0) 72%)",
  animation: "boite-aura-pulse 1.6s ease-in-out infinite",
};

/** Flash bref à l'instant où l'étoile est gagnée. */
const flashEtoile: CSSProperties = {
  position: "absolute",
  inset: "-20%",
  borderRadius: "50%",
  pointerEvents: "none",
  background:
    "radial-gradient(circle, rgba(255,248,225,0.9) 0%, rgba(255,231,170,0) 65%)",
  animation: "boite-flash 700ms ease-out both",
};

const etatLigne: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 12,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--brass-300)",
  // Remonté par la `key` sur le libellé : le mot rejoue son apparition au
  // moment où il change, sinon la bascule d'état passerait inaperçue.
  animation: "broc-bilan-pop 320ms cubic-bezier(0.2, 0.9, 0.3, 1.2) both",
};

export function CelebrationRestauration({
  objet,
  etatApres,
  onTermine,
}: CelebrationRestaurationProps) {
  const { d, tr, locale } = useLangue();
  const [phase, setPhase] = useState<Phase>(0);
  const cadreRef = useRef<HTMLDivElement | null>(null);
  const minuteries = useRef<number[]>([]);
  const termine = useRef(false);

  const pristin = estPristin(etatApres);
  const pristinRef = useRef(pristin);
  pristinRef.current = pristin;
  const rarity = getRarityColors(
    objet.rarete,
    !!getTemplate(objet.templateId)?.unique,
  );

  const arreterMinuteries = useCallback(() => {
    minuteries.current.forEach((id) => window.clearTimeout(id));
    minuteries.current = [];
  }, []);

  // Le vol : l'objet quitte l'écran vers l'onglet Stockage, qui pulse à
  // l'arrivée (même helper que toutes les autres arrivées d'objet du jeu).
  const envoyerAuStockage = () => {
    const rect = cadreRef.current?.getBoundingClientRect() ?? null;
    if (rect) {
      flyToTab({
        fromRect: rect,
        imageUrl: getItemImageUrl(objet.templateId),
        fallbackBg: rarity.thumbBg,
        borderColor: rarity.outer,
        targetSelector: '[data-fly-target="stockage-onglet"]',
        duration: SEQUENCE_MS.dureeVol,
        sansCadre: true,
      });
    }
    const id = window.setTimeout(() => {
      if (termine.current) return;
      termine.current = true;
      onTermine();
    }, SEQUENCE_MS.dureeVol);
    minuteries.current.push(id);
  };

  /**
   * Le dernier `envoyerAuStockage` connu, rafraîchi à chaque rendu.
   *
   * L'écran qui nous monte se re-rend CHAQUE SECONDE (décomptes des
   * établis) et recrée son `onTermine` au passage. Si la séquence dépendait
   * de cette identité, elle se replanifierait à chaque tick et n'atteindrait
   * jamais son vol : l'étoile repoppait en boucle (bug du 2026-08-28). La
   * séquence se planifie donc UNE FOIS au montage et lit ici sa version
   * fraîche au moment de tirer.
   */
  const envoyerRef = useRef(envoyerAuStockage);
  useEffect(() => {
    envoyerRef.current = envoyerAuStockage;
  });

  useEffect(() => {
    const planifier = (ms: number, fn: () => void) => {
      minuteries.current.push(window.setTimeout(fn, ms));
    };
    planifier(SEQUENCE_MS.etoiles, () => setPhase(1));
    planifier(SEQUENCE_MS.gagne, () => {
      setPhase(2);
      void audioManager.playUpgrade();
      if (pristinRef.current) void audioManager.playRarete();
    });
    planifier(SEQUENCE_MS.vol, () => {
      setPhase(3);
      envoyerRef.current();
    });
    return arreterMinuteries;
    // Montage UNIQUEMENT : cf. le commentaire d'`envoyerRef`.
  }, [arreterMinuteries]);

  const sauter = () => {
    if (phase === 3) return;
    arreterMinuteries();
    setPhase(3);
    envoyerRef.current();
  };

  const etatAffiche = phase >= 2 ? etatApres : objet.etat;

  return (
    <div
      data-testid="celebration-restauration"
      role="dialog"
      aria-label={tr(d.inventaire.celebrationRestaurationAria, {
        nom: nomObjet(objet, locale),
        etat: libelleEtat(etatApres, d),
      })}
      style={overlay}
      onClick={sauter}
    >
      <div style={{ ...colonne, opacity: phase >= 3 ? 0 : 1 }}>
        <div ref={cadreRef} style={cadreObjet}>
          {pristin && phase >= 2 && <span style={auraPristin} aria-hidden />}
          <ItemSticker
            templateId={objet.templateId}
            categorie={objet.categorie}
            size={CADRE}
            tilt={false}
            variant="normal"
            etat={etatAffiche}
            eager
          />
          {phase === 2 && <span style={flashEtoile} aria-hidden />}
        </div>
        {phase >= 1 && (
          // Wrapper porteur du data-attribut : StarRow n'accepte pas
          // d'attribut arbitraire. Surtout pas `display: contents` (rect 0×0).
          <span
            data-testid="etoiles-celebration"
            style={{ display: "inline-flex" }}
          >
            <StarRow
              filled={etoileCount(etatAffiche)}
              color={rarity.outer}
              size={30}
              gap={6}
              dropShadow
            />
          </span>
        )}
        {phase >= 1 && (
          <span
            key={etatAffiche}
            data-testid="etat-celebration"
            style={etatLigne}
          >
            {libelleEtat(etatAffiche, d)}
          </span>
        )}
      </div>
    </div>
  );
}
