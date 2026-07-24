"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import type { ReactNode } from "react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useLangue } from "@/lib/i18n/LangueContext";
import type { DictionnaireUI } from "@/lib/i18n/ui";
import {
  chargerIndex,
  renommerSlot,
  resumeSlot,
  slotActif,
  supprimerSlot,
  type IndexSlots,
  type NumeroSlot,
} from "@/lib/storage/slots";

interface PartiesModalProps {
  open: boolean;
  onClose: () => void;
  /** "gestion" (bouton Parties) ou "choisir-ecrasement" (Nouvelle partie, 3 slots pleins). */
  mode: "gestion" | "choisir-ecrasement";
  /** Nouvelle partie dans ce slot — la confirmation d'écrasement est DANS la modal. */
  onNouvellePartie: (slot: NumeroSlot) => void;
  /**
   * Appelé SYNCHRONE juste avant `supprimerSlot(actif)` (uniquement quand le
   * slot supprimé est l'actif). Sert à vider l'état en mémoire du
   * `GameContext` (voir `reset()`) AVANT le `reload()` : sans ça, le tick
   * d'auto-sauvegarde (settle énergie/quêtes, /60 s) peut se glisser entre
   * la suppression et le rechargement effectif de la page et réécrire
   * l'ancien state en mémoire dans la clé du slot qu'on vient de vider —
   * ressuscitant une partie qu'on croyait supprimée.
   */
  onAvantSuppressionActive?: () => void;
  /**
   * « Lancer la partie » sur le slot choisi. La modal ne bascule NI ne
   * navigue elle-même : le parent (écran titre) orchestre la fermeture
   * d'iris puis, au noir, détacher → changerSlotActif → navigation —
   * même protection contre la course d'auto-sauvegarde que l'ancien
   * onJouer (voir onLancerSlot dans src/app/page.tsx).
   */
  onLancer: (slot: NumeroSlot) => void;
}

const NUMEROS_SLOTS: readonly NumeroSlot[] = [1, 2, 3];
const LONGUEUR_MAX_NOM = 24;

/** « à l'instant » / « il y a X min/h/j » — localisé via le dictionnaire. */
function tempsRelatif(
  ts: number,
  d: DictionnaireUI,
  interpole: (g: string, p?: Record<string, string | number>) => string,
): string {
  const minutes = Math.floor((Date.now() - ts) / 60000);
  if (minutes < 1) return d.parties.aLInstant;
  if (minutes < 60) return interpole(d.parties.ilYAMin, { n: minutes });
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return interpole(d.parties.ilYAHeures, { n: heures });
  return interpole(d.parties.ilYAJours, { n: Math.floor(heures / 24) });
}

/* ------------------------------------------------------------------ */
/* Styles — voile flouté au-dessus de l'écran-titre (la façade reste    */
/* visible derrière), cartes papier flottantes.                         */
/* ------------------------------------------------------------------ */

const wrap: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 100,
  background: "rgba(15,31,24,0.35)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  paddingTop: "var(--safe-top)",
  paddingBottom: "var(--safe-bottom)",
  display: "flex",
  flexDirection: "column",
  overflowY: "auto",
};

const topBar: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 24px",
};

const titleStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 13,
  letterSpacing: "0.32em",
  textTransform: "uppercase",
  color: "var(--brass-300)",
  fontWeight: 700,
};

const closeBtn: CSSProperties = {
  background: "transparent",
  border: "1px solid var(--brass-500)",
  color: "var(--brass-300)",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  minWidth: "var(--tap-min)",
  minHeight: "var(--tap-min)",
};

const section: CSSProperties = {
  padding: "10px 24px",
};

const carte: CSSProperties = {
  background: "var(--forest-800)",
  border: "1px solid var(--brass-500)",
  boxShadow:
    "0 16px 32px rgba(0,0,0,0.38), inset 0 0 0 2px var(--forest-800), inset 0 0 0 3px var(--brass-500)",
  borderRadius: "var(--radius-card)",
  padding: "16px",
};

/* Slot choisi par le joueur : liseré laiton nettement accentué (bordure
   claire + double filet intérieur plus épais) = surbrillance de sélection. */
const carteChoisie: CSSProperties = {
  ...carte,
  border: "2px solid var(--brass-300)",
  boxShadow:
    "0 16px 32px rgba(0,0,0,0.38), 0 0 0 1px var(--brass-700), inset 0 0 0 2px var(--forest-800), inset 0 0 0 4px var(--brass-300)",
};

/* Bouton « Lancer la partie » : même format que les boutons du menu. */
const btnLancer: CSSProperties = {
  width: 250,
  padding: "14px 16px",
  background: "var(--forest-800)",
  color: "var(--brass-300)",
  border: "1px solid var(--brass-500)",
  borderRadius: 6,
  fontFamily: "var(--font-display)",
  fontSize: 12,
  letterSpacing: "0.20em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  cursor: "pointer",
  boxShadow:
    "0 6px 14px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,225,160,0.20)",
};

const btnLancerDesactive: CSSProperties = {
  ...btnLancer,
  cursor: "not-allowed",
  boxShadow: "none",
  opacity: 0.45,
  filter: "grayscale(0.6)",
};

const nomRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 6,
};

const nomStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 20,
  letterSpacing: "0.08em",
  color: "var(--paper-100)",
  fontWeight: 700,
};

const badgeActive: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--forest-800)",
  background: "var(--brass-300)",
  padding: "2px 8px",
  borderRadius: "var(--radius-btn)",
};

const resumeStyle: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: 16.5,
  color: "var(--paper-200)",
  marginBottom: 4,
};

const relatifStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--brass-500)",
  marginTop: 4,
};

const videRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 14,
  padding: "22px 0",
};

const videTitre: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 19,
  color: "var(--brass-300)",
};

const btnPlus: CSSProperties = {
  display: "grid",
  placeItems: "center",
  width: "var(--tap-min)",
  height: "var(--tap-min)",
  borderRadius: "50%",
  border: "1.5px solid var(--brass-500)",
  background: "transparent",
  color: "var(--brass-300)",
  cursor: "pointer",
  padding: 0,
  flexShrink: 0,
};

/* Boutons d'action des slots : format des boutons du menu d'accueil
   (display, capitales, radius 6, ombre portée), couleurs conservées
   par rôle — primaire forêt, secondaire papier, danger vermillon. */

const btnSlotBase: CSSProperties = {
  padding: "12px 14px",
  borderRadius: 6,
  fontFamily: "var(--font-display)",
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  cursor: "pointer",
  boxShadow:
    "0 6px 14px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,225,160,0.20)",
};

const btnSlotVariants = {
  primary: {
    background: "var(--forest-800)",
    color: "var(--brass-300)",
    border: "1px solid var(--brass-500)",
  },
  secondary: {
    background: "var(--paper-100)",
    color: "var(--forest-800)",
    border: "1px solid var(--brass-700)",
  },
  danger: {
    background: "var(--vermillion-600)",
    color: "var(--paper-200)",
    border: "1px solid var(--velvet-700)",
  },
} satisfies Record<string, CSSProperties>;

function BoutonSlot({
  variant,
  onClick,
  children,
  ariaLabel,
  style,
}: {
  variant: keyof typeof btnSlotVariants;
  onClick: () => void;
  children: ReactNode;
  ariaLabel?: string;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        // Ne pas déclencher la sélection de la carte porteuse.
        e.stopPropagation();
        onClick();
      }}
      aria-label={ariaLabel}
      style={{ ...btnSlotBase, ...btnSlotVariants[variant], ...style }}
    >
      {children}
    </button>
  );
}

const actionsRow: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const inputStyle: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: 14,
  color: "var(--ink-700)",
  border: "1px solid var(--brass-500)",
  borderRadius: "var(--radius-btn)",
  padding: "6px 8px",
  width: "100%",
  marginBottom: 4,
  background: "var(--paper-200)",
};

interface LigneSlot {
  n: NumeroSlot;
  /** Un slot est occupé si l'index a une entrée, même si la save est illisible. */
  occupe: boolean;
  nom: string | null;
  derniereSession: number;
  resume: {
    jour: number;
    niveau: number;
    budget: number;
    valeurCollection: number;
  } | null;
}

function construireLignes(index: IndexSlots): LigneSlot[] {
  return NUMEROS_SLOTS.map((n) => {
    const meta = index.slots[n];
    const resume = resumeSlot(n);
    // Occupé si l'index le dit OU si une save lisible existe sous la clé du
    // slot : un index corrompu/désynchronisé ne doit jamais faire passer une
    // vraie partie pour un emplacement vide (sinon « Nouvelle partie »
    // l'écraserait sans passer par la confirmation Écraser).
    return {
      n,
      occupe: meta !== null || resume !== null,
      nom: meta?.nom ?? null,
      derniereSession: meta?.derniereSession ?? 0,
      resume,
    };
  });
}

export function PartiesModal({
  open,
  onClose,
  mode,
  onNouvellePartie,
  onAvantSuppressionActive,
  onLancer,
}: PartiesModalProps) {
  const [index, setIndex] = useState<IndexSlots | null>(null);
  const [slotChoisi, setSlotChoisi] = useState<NumeroSlot | null>(null);
  const [renommage, setRenommage] = useState<NumeroSlot | null>(null);
  const [nomEnCours, setNomEnCours] = useState("");
  const [confirmSuppression, setConfirmSuppression] = useState<NumeroSlot | null>(null);
  const [confirmEcrasement, setConfirmEcrasement] = useState<NumeroSlot | null>(null);
  // Garde one-shot : évite un double déclenchement de la suppression (ex.
  // double clic / double événement) qui rejouerait `onAvantSuppressionActive`
  // + `supprimerSlot` par-dessus un état déjà nettoyé.
  const suppressionEnCoursRef = useRef(false);
  const { d, tr, locale } = useLangue();

  useEffect(() => {
    if (open) {
      setIndex(chargerIndex());
      setSlotChoisi(null);
      setRenommage(null);
      setConfirmSuppression(null);
      setConfirmEcrasement(null);
      suppressionEnCoursRef.current = false;
    }
  }, [open]);

  if (!open || index === null) return null;

  const rafraichir = () => setIndex(chargerIndex());

  const onDebuterRenommage = (n: NumeroSlot, nomActuel: string | null) => {
    setRenommage(n);
    setNomEnCours(nomActuel ?? "");
  };

  const onCommitRenommage = (n: NumeroSlot) => {
    renommerSlot(n, nomEnCours);
    setRenommage(null);
    rafraichir();
  };

  const onKeyDownRenommage = (n: NumeroSlot, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") onCommitRenommage(n);
  };

  const onSupprimerConfirme = (n: NumeroSlot) => {
    if (suppressionEnCoursRef.current) return;
    suppressionEnCoursRef.current = true;
    // Lu depuis le storage (pas le state React `index`, qui peut être
    // périmé) : c'est la source de vérité au moment réel de la suppression.
    const etaitActif = slotActif() === n;
    // Vide le state en mémoire AVANT la suppression + le reload : voir la
    // doc de `onAvantSuppressionActive` sur la course avec le tick
    // d'auto-sauvegarde.
    if (etaitActif) onAvantSuppressionActive?.();
    supprimerSlot(n);
    // Un slot supprimé ne doit pas rester « choisi » : le bouton Lancer
    // la partie pointerait sur un emplacement désormais vide.
    if (slotChoisi === n) setSlotChoisi(null);
    if (etaitActif) {
      window.location.reload();
    } else {
      suppressionEnCoursRef.current = false;
      rafraichir();
    }
  };

  const lignes = construireLignes(index);
  const slotAConfirmerSuppression =
    confirmSuppression !== null
      ? lignes.find((l) => l.n === confirmSuppression)
      : undefined;
  const slotAConfirmerEcrasement =
    confirmEcrasement !== null
      ? lignes.find((l) => l.n === confirmEcrasement)
      : undefined;

  return (
    <div role="dialog" aria-modal="true" aria-label={d.parties.titre} style={wrap}>
      <div style={topBar}>
        <h2 style={titleStyle}>{d.parties.titre}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={d.commun.fermer}
          style={closeBtn}
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* Les cartes suivent la barre de titre, avec un espace sous la croix. */}
      <div style={{ marginTop: 18 }}>
      {lignes.map((ligne) => {
        const estActif = index.actif === ligne.n;
        const occupe = ligne.occupe;
        // Un slot occupé se choisit d'un tap (surbrillance), le lancement
        // passe par le bouton « Lancer la partie » en bas.
        const selectionnable = mode === "gestion" && occupe;
        const choisi = slotChoisi === ligne.n;

        return (
          <section
            key={ligne.n}
            style={section}
            role="group"
            aria-label={tr(d.parties.emplacementN, { n: ligne.n })}
          >
            <div
              style={{
                ...(choisi ? carteChoisie : carte),
                ...(selectionnable ? { cursor: "pointer" } : {}),
              }}
              {...(selectionnable
                ? {
                    role: "button",
                    tabIndex: 0,
                    "aria-pressed": choisi,
                    "aria-label": tr(d.parties.choisirEmplacement, { n: ligne.n }),
                    onClick: () => setSlotChoisi(ligne.n),
                    onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSlotChoisi(ligne.n);
                      }
                    },
                  }
                : {})}
            >
              {occupe ? (
                <>
                  {/* Infos à gauche (4 lignes), crayon + poubelle à droite
                      sur la même hauteur que les infos. */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {renommage === ligne.n ? (
                        <input
                          autoFocus
                          type="text"
                          value={nomEnCours}
                          maxLength={LONGUEUR_MAX_NOM}
                          onChange={(e) => setNomEnCours(e.target.value)}
                          onBlur={() => onCommitRenommage(ligne.n)}
                          onKeyDown={(e) => onKeyDownRenommage(ligne.n, e)}
                          style={inputStyle}
                          aria-label={tr(d.parties.renommerEmplacement, { n: ligne.n })}
                        />
                      ) : (
                        <div style={nomRow}>
                          <span style={nomStyle}>
                            {ligne.nom ?? tr(d.parties.partieN, { n: ligne.n })}
                          </span>
                          {estActif && <span style={badgeActive}>{d.parties.active}</span>}
                        </div>
                      )}

                      {ligne.resume && (
                        <div style={resumeStyle}>
                          {tr(d.parties.jourNiveau, {
                            jour: ligne.resume.jour,
                            niveau: ligne.resume.niveau,
                          })}
                        </div>
                      )}
                      {ligne.resume && (
                        <div style={resumeStyle}>
                          {tr(d.parties.valeurCollection, {
                            valeur: ligne.resume.valeurCollection.toLocaleString(locale),
                          })}
                        </div>
                      )}
                      <div style={relatifStyle}>
                        {tempsRelatif(ligne.derniereSession, d, tr)}
                      </div>
                    </div>

                    {mode === "gestion" && (
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <BoutonSlot
                          variant="secondary"
                          onClick={() => onDebuterRenommage(ligne.n, ligne.nom)}
                          ariaLabel={d.parties.renommer}
                          style={{
                            padding: "12px 13px",
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          <Pencil size={16} strokeWidth={2} aria-hidden />
                        </BoutonSlot>
                        <BoutonSlot
                          variant="danger"
                          onClick={() => setConfirmSuppression(ligne.n)}
                          ariaLabel={d.parties.supprimer}
                          style={{
                            padding: "12px 13px",
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          <Trash2 size={16} strokeWidth={2} aria-hidden />
                        </BoutonSlot>
                      </div>
                    )}
                  </div>

                  {mode !== "gestion" && (
                    <div style={{ ...actionsRow, marginTop: 12 }}>
                      <BoutonSlot
                        variant="danger"
                        onClick={() => setConfirmEcrasement(ligne.n)}
                      >
                        {d.parties.ecraser}
                      </BoutonSlot>
                    </div>
                  )}
                </>
              ) : (
                <div style={videRow}>
                  <span style={videTitre}>{d.parties.emplacementVide}</span>
                  <button
                    type="button"
                    onClick={() => onNouvellePartie(ligne.n)}
                    aria-label={tr(d.parties.creerDansEmplacement, { n: ligne.n })}
                    style={btnPlus}
                  >
                    <Plus size={18} strokeWidth={2.5} />
                  </button>
                </div>
              )}
            </div>
          </section>
        );
      })}
      </div>

      {/* Juste sous les slots, dans le flux (pas collé en bas d'écran). */}
      {mode === "gestion" && (
        <div
          style={{
            padding: "14px 24px 8px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            disabled={slotChoisi === null}
            onClick={() => {
              if (slotChoisi !== null) onLancer(slotChoisi);
            }}
            style={slotChoisi === null ? btnLancerDesactive : btnLancer}
          >
            {d.parties.lancer}
          </button>
        </div>
      )}

      <ConfirmModal
        open={confirmSuppression !== null}
        onClose={() => setConfirmSuppression(null)}
        onConfirm={() => {
          if (confirmSuppression !== null) onSupprimerConfirme(confirmSuppression);
        }}
        titre={tr(d.parties.confirmSupprimerTitre, {
          nom:
            slotAConfirmerSuppression?.nom ??
            tr(d.parties.partieN, { n: confirmSuppression ?? "" }),
        })}
        confirmLabel={d.parties.supprimer}
        danger
      >
        {d.parties.confirmSupprimerCorps}
      </ConfirmModal>

      <ConfirmModal
        open={confirmEcrasement !== null}
        onClose={() => setConfirmEcrasement(null)}
        onConfirm={() => {
          if (confirmEcrasement !== null) onNouvellePartie(confirmEcrasement);
        }}
        titre={tr(d.parties.confirmEcraserTitre, {
          nom:
            slotAConfirmerEcrasement?.nom ??
            tr(d.parties.partieN, { n: confirmEcrasement ?? "" }),
        })}
        confirmLabel={d.parties.ecraser}
        danger
      >
        {d.parties.confirmEcraserCorps}
      </ConfirmModal>
    </div>
  );
}
