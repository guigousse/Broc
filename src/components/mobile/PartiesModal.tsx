"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { Plus, Trash2, X } from "lucide-react";
import type { ReactNode } from "react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  changerSlotActif,
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
   * Appelé SYNCHRONE juste avant `changerSlotActif(n)` dans `onJouer`. Sert à
   * détacher l'état en mémoire du `GameContext` (voir `detacherPartie()`)
   * AVANT la bascule : sans ça, entre le changement d'emplacement actif en
   * storage et le rechargement effectif de la page (`window.location.href`),
   * le tick d'auto-sauvegarde de CET écran (toujours monté, toujours branché
   * sur l'ANCIEN state) peut se glisser dans cette fenêtre et réécrire
   * l'ancienne partie dans la clé du slot qu'on vient d'activer — perte
   * silencieuse et définitive de la partie choisie. Même famille de course
   * que `onAvantSuppressionActive` et que la bascule différée de l'intro.
   */
  onAvantBascule?: () => void;
}

const NUMEROS_SLOTS: readonly NumeroSlot[] = [1, 2, 3];
const LONGUEUR_MAX_NOM = 24;

/** « à l'instant » / « il y a X min » / « il y a X h » / « il y a X j » — pas de dépendance externe pour un affichage aussi simple. */
function tempsRelatif(ts: number): string {
  const minutes = Math.floor((Date.now() - ts) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.floor(heures / 24);
  return `il y a ${jours} j`;
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
  padding: 6,
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
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

/* Slot actif : liseré laiton nettement accentué (bordure claire + double
   filet intérieur plus épais) pour le repérer d'un coup d'œil. */
const carteActive: CSSProperties = {
  ...carte,
  border: "2px solid var(--brass-300)",
  boxShadow:
    "0 16px 32px rgba(0,0,0,0.38), 0 0 0 1px var(--brass-700), inset 0 0 0 2px var(--forest-800), inset 0 0 0 4px var(--brass-300)",
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
  marginBottom: 14,
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
  width: 34,
  height: 34,
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
      onClick={onClick}
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
  resume: { jour: number; niveau: number; budget: number } | null;
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
  onAvantBascule,
}: PartiesModalProps) {
  const [index, setIndex] = useState<IndexSlots | null>(null);
  const [renommage, setRenommage] = useState<NumeroSlot | null>(null);
  const [nomEnCours, setNomEnCours] = useState("");
  const [confirmSuppression, setConfirmSuppression] = useState<NumeroSlot | null>(null);
  const [confirmEcrasement, setConfirmEcrasement] = useState<NumeroSlot | null>(null);
  // Garde one-shot : évite un double déclenchement de la suppression (ex.
  // double clic / double événement) qui rejouerait `onAvantSuppressionActive`
  // + `supprimerSlot` par-dessus un état déjà nettoyé.
  const suppressionEnCoursRef = useRef(false);

  useEffect(() => {
    if (open) {
      setIndex(chargerIndex());
      setRenommage(null);
      setConfirmSuppression(null);
      setConfirmEcrasement(null);
      suppressionEnCoursRef.current = false;
    }
  }, [open]);

  if (!open || index === null) return null;

  const rafraichir = () => setIndex(chargerIndex());

  const onJouer = (n: NumeroSlot) => {
    // Détache l'état en mémoire AVANT la bascule : voir la doc de
    // `onAvantBascule` sur la course avec le tick d'auto-sauvegarde.
    onAvantBascule?.();
    changerSlotActif(n);
    window.location.href = "/bureau";
  };

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
    <div role="dialog" aria-modal="true" aria-label="Parties" style={wrap}>
      <div style={topBar}>
        <h2 style={titleStyle}>— Parties —</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
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

        return (
          <section
            key={ligne.n}
            style={section}
            role="group"
            aria-label={`Emplacement ${ligne.n}`}
          >
            <div style={estActif ? carteActive : carte}>
              {occupe ? (
                <>
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
                      aria-label={`Renommer l'emplacement ${ligne.n}`}
                    />
                  ) : (
                    <div style={nomRow}>
                      <span style={nomStyle}>{ligne.nom ?? `Partie ${ligne.n}`}</span>
                      {estActif && <span style={badgeActive}>Active</span>}
                    </div>
                  )}

                  {ligne.resume && (
                    <div style={resumeStyle}>
                      Jour {ligne.resume.jour} · Niveau {ligne.resume.niveau} ·{" "}
                      {ligne.resume.budget.toLocaleString("fr-FR")} €
                    </div>
                  )}
                  <div style={relatifStyle}>{tempsRelatif(ligne.derniereSession)}</div>

                  <div style={actionsRow}>
                    {mode === "gestion" ? (
                      <>
                        <BoutonSlot variant="primary" onClick={() => onJouer(ligne.n)}>
                          {estActif ? "Reprendre" : "Jouer"}
                        </BoutonSlot>
                        <BoutonSlot
                          variant="secondary"
                          onClick={() => onDebuterRenommage(ligne.n, ligne.nom)}
                        >
                          Renommer
                        </BoutonSlot>
                        <BoutonSlot
                          variant="danger"
                          onClick={() => setConfirmSuppression(ligne.n)}
                          ariaLabel="Supprimer"
                          style={{
                            marginLeft: "auto",
                            padding: "12px 13px",
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          <Trash2 size={16} strokeWidth={2} aria-hidden />
                        </BoutonSlot>
                      </>
                    ) : (
                      <BoutonSlot
                        variant="danger"
                        onClick={() => setConfirmEcrasement(ligne.n)}
                      >
                        Écraser
                      </BoutonSlot>
                    )}
                  </div>
                </>
              ) : (
                <div style={videRow}>
                  <span style={videTitre}>Emplacement vide</span>
                  <button
                    type="button"
                    onClick={() => onNouvellePartie(ligne.n)}
                    aria-label={`Nouvelle partie dans l'emplacement ${ligne.n}`}
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

      <ConfirmModal
        open={confirmSuppression !== null}
        onClose={() => setConfirmSuppression(null)}
        onConfirm={() => {
          if (confirmSuppression !== null) onSupprimerConfirme(confirmSuppression);
        }}
        titre={`Supprimer « ${
          slotAConfirmerSuppression?.nom ?? `Partie ${confirmSuppression ?? ""}`
        } » ?`}
        confirmLabel="Supprimer"
        danger
      >
        Cette partie sera définitivement perdue.
      </ConfirmModal>

      <ConfirmModal
        open={confirmEcrasement !== null}
        onClose={() => setConfirmEcrasement(null)}
        onConfirm={() => {
          if (confirmEcrasement !== null) onNouvellePartie(confirmEcrasement);
        }}
        titre={`Écraser « ${
          slotAConfirmerEcrasement?.nom ?? `Partie ${confirmEcrasement ?? ""}`
        } » ?`}
        confirmLabel="Écraser"
        danger
      >
        Cette partie sera définitivement perdue au profit d&apos;une nouvelle.
      </ConfirmModal>
    </div>
  );
}
