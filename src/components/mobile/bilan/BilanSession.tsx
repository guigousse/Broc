"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, DoorOpen, Package } from "lucide-react";
import { BarreBasSession } from "@/components/mobile/BarreBasSession";
import { CadreBilan } from "@/components/mobile/bilan/CadreBilan";
import { ItemSticker } from "@/components/ui/ItemSticker";
import { getTemplate } from "@/data/objetTemplates";
import { audioManager } from "@/lib/audio/audioManager";
import {
  EFFACEMENT_LIGNE_MS,
  POP_PASTILLE_MS,
  SORTIE_APRES_PASSAGE_MS,
  phasesEnvoiItems,
  phasesEnvoiXp,
  type EtapeCeremonie,
} from "@/lib/bilan/ceremonie";
import { flyToTab } from "@/lib/flyAnimation";
import { nomObjet } from "@/lib/i18n/contenu";
import { useLangue } from "@/lib/i18n/LangueContext";
import { getItemThumbUrl } from "@/lib/itemImages";
import { getRarityColors } from "@/lib/rarityColors";
import { prefersReducedMotion } from "@/lib/transitionIris";
import { degelerXpAffichage } from "@/lib/xpAffichageGele";
import type { CategorieObjet } from "@/types/game";

export interface BilanItem {
  templateId: string;
  nom: string;
  categorie: CategorieObjet;
  /** Prix payé (chinage) — affiché en négatif. */
  prix: number;
}

export type SourceXp = "achats" | "decouvertes" | "negociations";

export interface LigneXp {
  cle: SourceXp;
  montant: number;
}

export interface BilanSessionProps {
  /** Nom localisé de la brocante. */
  titre: string;
  items: BilanItem[];
  /** Lignes du décompte ; les montants nuls sont ignorés. */
  xpLignes: ReadonlyArray<LigneXp>;
  /** Sélecteur CSS de la cible du vol des items. */
  cibleVolItems: string;
  /** Occupation du stockage à l'entrée de session (le compteur monte pendant la cérémonie). */
  stockageDepart: { occupe: number; capacite: number };
  /** Fin de cérémonie : au parent d'enregistrer la session et de quitter. */
  onTermine: () => void;
}

const CIBLE_XP = '[data-fly-target="xp-header"]';

/**
 * Étapes du bilan, avancées par le joueur — jamais enchaînées toutes seules :
 * il lit son bilan, puis déclenche chaque acte quand il veut.
 *
 * `attente` → « Continuer » → `acte1` (envol des objets, décompte qui se
 * compose) → `pretActe2` → « Rentrer à la boutique » → `acte2` (envol de la
 * pastille, barre qui progresse) → sortie.
 */
type PhaseBilan = "attente" | "acte1" | "pretActe2" | "acte2";

/**
 * Bilan de fin de session, joué DANS la session : les deux headers et le fond
 * de brocante flouté restent en place, les objets achetés s'envolent un à un
 * vers le stockage, puis le décompte d'expérience part rejoindre la barre de
 * niveau — qui ne progresse qu'à cet instant (cf. `xpAffichageGele`).
 */
export function BilanSession({
  titre,
  items,
  xpLignes,
  cibleVolItems,
  stockageDepart,
  onTermine,
}: BilanSessionProps) {
  const { d, tr, locale } = useLangue();

  // Le bilan s'ouvre sur une session terminée : ses données ne bougent plus.
  // On les fige au montage pour que la frise (calée sur ces longueurs) ne
  // puisse pas se désynchroniser d'un re-rendu du parent.
  const [fige] = useState(() => ({
    items,
    lignes: xpLignes.filter((l) => l.montant > 0),
  }));

  const totalPrix = fige.items.reduce((s, it) => s + it.prix, 0);
  const totalXp = fige.lignes.reduce((s, l) => s + l.montant, 0);

  /** Rien à montrer : le premier acte n'aurait aucun contenu, on ouvre
   *  directement sur « Rentrer à la boutique ». */
  const [phase, setPhase] = useState<PhaseBilan>(() =>
    fige.items.length === 0 && fige.lignes.length === 0 ? "pretActe2" : "attente",
  );
  const [itemsPartis, setItemsPartis] = useState(0);
  const [itemsAtterris, setItemsAtterris] = useState(0);
  const [lignesVisibles, setLignesVisibles] = useState(0);
  const [pastilleVisible, setPastilleVisible] = useState(false);

  /** Un acte est en cours : le bouton est inerte et un tap passe l'animation. */
  const enAnimation = phase === "acte1" || phase === "acte2";

  const refsItems = useRef<Map<number, HTMLSpanElement | null>>(new Map());
  const refPastille = useRef<HTMLSpanElement>(null);
  const refZone = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** Garde : `onTermine` ne doit partir qu'une fois. */
  const termineRef = useRef(false);
  /** Tenu à jour : le minuteur de sortie ne doit pas rappeler une closure périmée. */
  const onTermineRef = useRef(onTermine);
  /** Le dégel (et son accent sonore) n'a lieu qu'une fois, quel que soit le chemin. */
  const degelFaitRef = useRef(false);

  useEffect(() => {
    onTermineRef.current = onTermine;
  });

  const purgerTimeouts = () => {
    for (const t of timeoutsRef.current) clearTimeout(t);
    timeoutsRef.current = [];
  };

  useEffect(() => purgerTimeouts, []);

  const terminer = () => {
    if (termineRef.current) return;
    termineRef.current = true;
    onTermineRef.current();
  };

  /** Rend sa vraie valeur à la barre de niveau. Le son de rang n'accompagne
   *  le dégel que s'il y avait effectivement de l'XP à gagner, et seulement
   *  si l'appelant ne joue pas déjà un son (mouvement réduit). */
  const degeler = (avecSon = true) => {
    if (degelFaitRef.current) return;
    degelFaitRef.current = true;
    if (avecSon && fige.lignes.length > 0) audioManager.playRarete();
    degelerXpAffichage();
  };

  const volerItem = (index: number) => {
    const el = refsItems.current.get(index);
    const item = fige.items[index];
    if (!el || !item) return;
    const template = getTemplate(item.templateId);
    const rarity = getRarityColors(template?.rarete ?? "commun", template?.unique === true);
    flyToTab({
      fromRect: el.getBoundingClientRect(),
      imageUrl: getItemThumbUrl(item.templateId),
      fallbackBg: rarity.thumbBg,
      borderColor: rarity.outer,
      targetSelector: cibleVolItems,
    });
  };

  const volerPastille = () => {
    const el = refPastille.current;
    if (!el) return;
    flyToTab({
      fromRect: el.getBoundingClientRect(),
      imageUrl: null,
      fallbackBg: "var(--brass-500)",
      borderColor: "var(--brass-700)",
      targetSelector: CIBLE_XP,
      // Son distinct de l'ajout au stockage : on ne range rien, on gagne un rang
      // (joué à l'atterrissage, cf. case "degel" — pas au décollage).
      playSound: false,
    });
  };

  const appliquer = (etape: EtapeCeremonie) => {
    switch (etape.type) {
      case "envolItem":
        volerItem(etape.index);
        setItemsPartis(etape.index + 1);
        break;
      case "atterrissageItem":
        setItemsAtterris(etape.index + 1);
        break;
      case "ligneXp":
        setLignesVisibles(etape.index + 1);
        break;
      case "pastille":
        setPastilleVisible(true);
        break;
      case "volPastille":
        volerPastille();
        break;
      case "degel":
        degeler();
        break;
      case "sortie":
        terminer();
        break;
    }
  };

  /** Pose d'un coup l'état de fin d'acte 1 : tout est rangé, tout est compté. */
  const poserFinActe1 = () => {
    purgerTimeouts();
    setItemsPartis(fige.items.length);
    setItemsAtterris(fige.items.length);
    setLignesVisibles(fige.lignes.length);
    setPastilleVisible(fige.lignes.length > 0);
  };

  /** Acte 1 : « Continuer » — les objets partent, le décompte se compose. */
  const lancerActe1 = () => {
    // Les lignes hors champ enverraient leurs clones depuis l'extérieur de l'écran.
    refZone.current?.scrollTo({ top: 0 });
    if (prefersReducedMotion()) {
      poserFinActe1();
      if (fige.items.length > 0) audioManager.playPickup();
      setPhase("pretActe2");
      return;
    }
    setPhase("acte1");
    const frise = phasesEnvoiItems(fige.items.length, fige.lignes.length);
    for (const { at, etape } of frise) {
      timeoutsRef.current.push(setTimeout(() => appliquer(etape), at));
    }
    const fin = frise.length > 0 ? frise[frise.length - 1].at : 0;
    timeoutsRef.current.push(setTimeout(() => setPhase("pretActe2"), fin));
  };

  /** Acte 2 : « Rentrer à la boutique » — la pastille rejoint la barre. */
  const lancerActe2 = () => {
    const avecPastille = fige.lignes.length > 0;
    if (prefersReducedMotion()) {
      purgerTimeouts();
      degeler();
      terminer();
      return;
    }
    setPhase("acte2");
    for (const { at, etape } of phasesEnvoiXp(avecPastille)) {
      timeoutsRef.current.push(setTimeout(() => appliquer(etape), at));
    }
  };

  /** Tap pendant une animation : on saute à la fin de l'acte en cours. */
  const passer = () => {
    if (phase === "acte1") {
      poserFinActe1();
      setPhase("pretActe2");
      return;
    }
    purgerTimeouts();
    degeler();
    timeoutsRef.current.push(setTimeout(terminer, SORTIE_APRES_PASSAGE_MS));
  };

  const boutonPrincipal = () => {
    if (phase === "attente") return lancerActe1();
    if (phase === "pretActe2") return lancerActe2();
  };

  // Le libellé ne bascule qu'une fois l'acte 1 terminé : pendant l'animation
  // il annoncerait la suite avant qu'elle soit jouable.
  const avantActe2 = phase === "attente" || phase === "acte1";
  const libelleBouton = avantActe2 ? d.bilan.continuer : d.bilan.rentrerBoutique;

  const mention =
    fige.items.length === 0
      ? d.bilan.pochesVides
      : fige.items.length === 1
        ? tr(d.bilan.unObjetTotal, { total: totalPrix })
        : tr(d.bilan.nObjetsTotal, { n: fige.items.length, total: totalPrix });

  const libelleLigne: Record<SourceXp, string> = {
    achats: d.bilan.xpAchats,
    decouvertes: d.bilan.xpDecouvertes,
    negociations: d.bilan.xpNegociations,
  };

  const occupe = Math.min(
    stockageDepart.occupe + itemsAtterris,
    stockageDepart.capacite,
  );

  return (
    <div style={colonne}>
      {/* Capteur de tap « passer » : porté sur document.body pour couvrir aussi
          le header (« un tap n'importe où »), et notamment neutraliser le bouton
          de recharge d'énergie — une pub lancée en pleine cérémonie verrait sa
          récompense perdue par la navigation de fin. */}
      {enAnimation &&
        typeof document !== "undefined" &&
        createPortal(
          <button
            type="button"
            data-testid="bilan-passer"
            aria-hidden
            tabIndex={-1}
            onClick={passer}
            style={capteurPassage}
          />,
          document.body,
        )}

      <div style={enTete}>
        <CadreBilan titre={d.bilan.titreChinage} sousTitre={titre} mention={mention} />
      </div>

      <div ref={refZone} style={zoneDefilante}>
        {fige.items.length > 0 && (
          <ul style={liste}>
            {fige.items.map((it, i) => (
              <li
                key={`${it.templateId}-${i}`}
                style={{
                  ...ligneItem,
                  animation:
                    i < itemsPartis
                      ? `broc-bilan-ligne-out ${EFFACEMENT_LIGNE_MS}ms ease-in forwards`
                      : undefined,
                }}
              >
                <span
                  ref={(el) => {
                    refsItems.current.set(i, el);
                  }}
                  style={{ display: "inline-flex" }}
                >
                  <ItemSticker templateId={it.templateId} categorie={it.categorie} thumb />
                </span>
                <span style={nomItem}>{nomObjet(it, locale)}</span>
                <span style={prixItem}>−{it.prix} €</span>
              </li>
            ))}
          </ul>
        )}

        {lignesVisibles > 0 && (
          <div style={blocXp}>
            <div style={eyebrowXp}>{d.bilan.xpEyebrow}</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {fige.lignes.slice(0, lignesVisibles).map((l) => (
                <li
                  key={l.cle}
                  style={{ ...ligneXp, animation: `broc-bilan-pop ${POP_PASTILLE_MS}ms ease-out` }}
                >
                  <span>{libelleLigne[l.cle]}</span>
                  <span style={montantXp}>+{l.montant}</span>
                </li>
              ))}
            </ul>
            {pastilleVisible && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
                <span
                  ref={refPastille}
                  style={{ ...pastille, animation: `broc-bilan-pop ${POP_PASTILLE_MS}ms ease-out` }}
                >
                  {tr(d.bilan.xpTotal, { n: totalXp })}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <BarreBasSession
        gauche={
          <button
            type="button"
            aria-label={libelleBouton}
            onClick={boutonPrincipal}
            disabled={enAnimation}
            style={{ ...boutonQg, opacity: enAnimation ? 0.45 : 1 }}
          >
            {avantActe2 ? (
              <ArrowRight size={26} strokeWidth={2} />
            ) : (
              <DoorOpen size={26} strokeWidth={2} />
            )}
            {libelleBouton}
          </button>
        }
        droite={
          <span
            data-fly-target="stockage-bilan"
            role="img"
            aria-label={tr(d.bilan.stockageAria, {
              occupe,
              capacite: stockageDepart.capacite,
            })}
            style={jauge}
          >
            <Package size={22} strokeWidth={2} aria-hidden />
            {occupe}/{stockageDepart.capacite}
          </span>
        }
      />
    </div>
  );
}

const colonne: CSSProperties = {
  position: "relative",
  display: "flex",
  flexDirection: "column",
  height: "100%",
};

/** Capteur du tap « passer » : porté sur document.body, au-dessus du header
 *  (z-index 30) mais sous les overlays modaux du jeu (z-index 110+). */
const capteurPassage: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 40,
  background: "transparent",
  border: "none",
  padding: 0,
  cursor: "pointer",
};

/** Le cadre est hors flux défilant : il reste l'ancrage visuel pendant que la
 *  liste se vide (cf. spécification). */
const enTete: CSSProperties = {
  padding: "18px 16px 0",
};

const zoneDefilante: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  WebkitOverflowScrolling: "touch",
  padding: "14px 16px 24px",
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const liste: CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
};

const ligneItem: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  alignItems: "center",
  gap: 12,
  padding: "10px 4px",
  borderBottom: "1px dotted rgba(247,244,238,0.35)",
  overflow: "hidden",
};

const nomItem: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 600,
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--paper-100)",
  textShadow: "0 1px 3px rgba(0,0,0,0.65)",
};

/** Petite étiquette de prix, comme un cartel épinglé sur l'objet : le vermillon
 *  sur papier reste franc, alors que posé sur la photo floutée de la brocante
 *  il se noyait dans les verts (retour device 2026-07-26). */
const prixItem: CSSProperties = {
  justifySelf: "end",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 15,
  color: "var(--vermillion-600)",
  background: "rgba(247,244,238,0.95)",
  border: "1px solid var(--brass-500)",
  padding: "3px 9px",
  whiteSpace: "nowrap",
  boxShadow: "0 2px 6px rgba(15,30,22,0.4)",
};

const blocXp: CSSProperties = {
  background: "rgba(15,30,22,0.55)",
  border: "1px solid var(--brass-700)",
  padding: "14px 18px 16px",
};

const eyebrowXp: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--brass-300)",
  textAlign: "center",
  marginBottom: 10,
};

const ligneXp: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "5px 0",
  fontFamily: "var(--font-display)",
  fontSize: 13,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--paper-100)",
};

const montantXp: CSSProperties = {
  fontFamily: "var(--font-mono)",
  color: "var(--brass-300)",
};

const pastille: CSSProperties = {
  display: "inline-block",
  padding: "6px 16px",
  background: "var(--brass-500)",
  border: "1.5px solid var(--brass-700)",
  color: "var(--forest-800)",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 15,
  letterSpacing: "0.1em",
};

const boutonQg: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: "var(--brass-300)",
  fontFamily: "var(--font-mono)",
  fontSize: "clamp(10px, 2.6vw, 12px)",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  padding: 0,
};

const jauge: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  color: "var(--brass-300)",
  fontFamily: "var(--font-mono)",
  fontSize: 13,
};
