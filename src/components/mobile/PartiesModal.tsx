"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { BrassCorners } from "@/components/ui/BrassCorners";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Button } from "@/components/ui/Button";
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
/* Styles — même pattern que ReglagesModal (scrim, carte papier, mono). */
/* ------------------------------------------------------------------ */

const wrap: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 100,
  backgroundColor: "var(--forest-900)",
  backgroundImage:
    "radial-gradient(ellipse at 50% 35%, rgba(40,74,56,0.7) 0%, rgba(15,31,24,0) 65%), url(/assets/grain-overlay.svg)",
  backgroundSize: "cover, 320px 320px",
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
  borderBottom: "1px solid var(--brass-700)",
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
  padding: "18px 24px",
  borderBottom: "1px dotted var(--brass-700)",
};

const carte: CSSProperties = {
  background: "var(--paper-100)",
  border: "1px solid var(--brass-500)",
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
  borderRadius: "var(--radius-card)",
  padding: "16px",
};

const nomRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 4,
};

const nomStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 14,
  letterSpacing: "0.08em",
  color: "var(--ink-700)",
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
  fontSize: 13,
  color: "var(--ink-700)",
  marginBottom: 2,
};

const relatifStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
  marginBottom: 12,
};

const videTitre: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 14,
  color: "var(--brass-700)",
  marginBottom: 12,
};

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
      <BrassCorners color="var(--brass-500)" inset={10} size={32} />
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
            <div style={carte}>
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
                        <Button size="sm" variant="primary" onClick={() => onJouer(ligne.n)}>
                          {estActif ? "Reprendre" : "Jouer"}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onDebuterRenommage(ligne.n, ligne.nom)}
                        >
                          Renommer
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setConfirmSuppression(ligne.n)}
                        >
                          Supprimer
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setConfirmEcrasement(ligne.n)}
                      >
                        Écraser
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div style={videTitre}>Emplacement vide</div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onNouvellePartie(ligne.n)}
                  >
                    Nouvelle partie ici
                  </Button>
                </>
              )}
            </div>
          </section>
        );
      })}

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
