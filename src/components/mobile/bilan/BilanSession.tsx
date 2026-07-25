"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { DoorOpen, Package } from "lucide-react";
import { BarreBasSession } from "@/components/mobile/BarreBasSession";
import { CadreBilan } from "@/components/mobile/bilan/CadreBilan";
import { ItemSticker } from "@/components/ui/ItemSticker";
import { getTemplate } from "@/data/objetTemplates";
import { audioManager } from "@/lib/audio/audioManager";
import {
  EFFACEMENT_LIGNE_MS,
  POP_PASTILLE_MS,
  SORTIE_APRES_PASSAGE_MS,
  phasesCeremonie,
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

  const lignes = xpLignes.filter((l) => l.montant > 0);
  const totalPrix = items.reduce((s, it) => s + it.prix, 0);
  const totalXp = lignes.reduce((s, l) => s + l.montant, 0);

  const [lance, setLance] = useState(false);
  const [itemsPartis, setItemsPartis] = useState(0);
  const [itemsAtterris, setItemsAtterris] = useState(0);
  const [lignesVisibles, setLignesVisibles] = useState(0);
  const [pastilleVisible, setPastilleVisible] = useState(false);
  /** Mouvement réduit : l'état final est posé, le tap suivant sort. */
  const [pretASortir, setPretASortir] = useState(false);

  const refsItems = useRef<Map<number, HTMLLIElement | null>>(new Map());
  const refPastille = useRef<HTMLSpanElement>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** Garde : `onTermine` ne doit partir qu'une fois. */
  const termineRef = useRef(false);

  const purgerTimeouts = () => {
    for (const t of timeoutsRef.current) clearTimeout(t);
    timeoutsRef.current = [];
  };

  useEffect(() => purgerTimeouts, []);

  const terminer = () => {
    if (termineRef.current) return;
    termineRef.current = true;
    onTermine();
  };

  const volerItem = (index: number) => {
    const el = refsItems.current.get(index);
    const item = items[index];
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
      // Son distinct de l'ajout au stockage : on ne range rien, on gagne un rang.
      playSound: false,
    });
    audioManager.playRarete();
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
        degelerXpAffichage();
        break;
      case "sortie":
        terminer();
        break;
    }
  };

  /** Pose l'état final d'un coup (passage de cérémonie, mouvement réduit). */
  const poserEtatFinal = () => {
    purgerTimeouts();
    setItemsPartis(items.length);
    setItemsAtterris(items.length);
    setLignesVisibles(lignes.length);
    setPastilleVisible(lignes.length > 0);
    degelerXpAffichage();
  };

  const lancer = () => {
    if (lance) return;
    setLance(true);
    if (prefersReducedMotion()) {
      poserEtatFinal();
      if (items.length > 0) audioManager.playPickup();
      setPretASortir(true);
      return;
    }
    for (const { at, etape } of phasesCeremonie(items.length, lignes.length)) {
      timeoutsRef.current.push(setTimeout(() => appliquer(etape), at));
    }
  };

  const passer = () => {
    poserEtatFinal();
    timeoutsRef.current.push(setTimeout(terminer, SORTIE_APRES_PASSAGE_MS));
  };

  const boutonRetour = () => {
    if (!lance) return lancer();
    if (pretASortir) return terminer();
  };

  const mention =
    items.length === 0
      ? d.bilan.pochesVides
      : items.length === 1
        ? tr(d.bilan.unObjetTotal, { total: totalPrix })
        : tr(d.bilan.nObjetsTotal, { n: items.length, total: totalPrix });

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
      {/* Capteur de tap « passer » : couvre tout le calque, barre du bas
          comprise (« un tap n'importe où »), et n'existe que pendant la
          cérémonie animée — le bouton Retour au QG est de toute façon
          désactivé à ce moment-là. */}
      {lance && !pretASortir && (
        <button
          type="button"
          data-testid="bilan-passer"
          aria-hidden
          tabIndex={-1}
          onClick={passer}
          style={capteurPassage}
        />
      )}

      <div style={zoneDefilante}>
        <CadreBilan titre={d.bilan.titreChinage} sousTitre={titre} mention={mention} />

        {items.length > 0 && (
          <ul style={liste}>
            {items.map((it, i) => (
              <li
                key={`${it.templateId}-${i}`}
                ref={(el) => {
                  refsItems.current.set(i, el);
                }}
                style={{
                  ...ligneItem,
                  animation:
                    i < itemsPartis
                      ? `broc-bilan-ligne-out ${EFFACEMENT_LIGNE_MS}ms ease-in forwards`
                      : undefined,
                }}
              >
                <ItemSticker templateId={it.templateId} categorie={it.categorie} thumb />
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
              {lignes.slice(0, lignesVisibles).map((l) => (
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
            aria-label={d.bilan.retourQgAria}
            onClick={boutonRetour}
            disabled={lance && !pretASortir}
            style={{ ...boutonQg, opacity: lance && !pretASortir ? 0.45 : 1 }}
          >
            <DoorOpen size={26} strokeWidth={2} />
            {d.bilan.retourQg}
          </button>
        }
        droite={
          <span
            data-fly-target="stockage-bilan"
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

/** Capteur plein calque du tap « passer », au-dessus du contenu et de la barre. */
const capteurPassage: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 1,
  background: "transparent",
  border: "none",
  padding: 0,
  cursor: "pointer",
};

const zoneDefilante: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  WebkitOverflowScrolling: "touch",
  padding: "18px 16px 24px",
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

const prixItem: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 16,
  color: "var(--vermillion-600)",
  textShadow: "0 1px 3px rgba(0,0,0,0.5)",
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
