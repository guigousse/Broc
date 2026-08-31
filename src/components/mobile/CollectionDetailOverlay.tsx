"use client";

import type { CSSProperties } from "react";
import { Album, ArrowUpRight, BookOpen, Plus } from "lucide-react";
import { FicheObjet, ficheBackdrop } from "@/components/ui/FicheObjet";
import { useLangue } from "@/lib/i18n/LangueContext";
import { nomObjet } from "@/lib/i18n/contenu";
import type { CollectionSlot } from "@/types/game";

interface CollectionDetailOverlayProps {
  open: boolean;
  onClose: () => void;
  slot: CollectionSlot | null;
  /** Nombre d'objets éligibles dans l'inventaire pour ce slot. */
  candidatsCount: number;
  /** Si vrai, bouton Retirer désactivé (stockage plein). */
  retirerDisabled?: boolean;
  /** Appelé lorsqu'on demande à ajouter une donation (ouvre le picker). */
  onAjouter: () => void;
  /** Appelé lorsqu'on demande à retirer la donation. */
  onRetirer: () => void;
  /**
   * Optionnel (tutoriel) : pendant une leçon guidée, le bouton « retirer »
   * est montré (data-tuto-coach) mais rendu inerte — apparence normale,
   * mais le tap ne déclenche rien. Fait aussi passer l'overlay sous le
   * voile du coach (cf. `backdrop` ci-dessous) pour que la découpe du coach
   * l'éclaire correctement plutôt que de rester masquée derrière.
   */
  retirerInerte?: boolean;
}

/**
 * `TutorielCoach` (voile + découpe) est à z-index 100 — sous cet overlay en
 * temps normal (105). Pendant la leçon guidée qui montre le bouton retirer,
 * on passe l'overlay SOUS le coach pour que sa découpe éclaire réellement le
 * bouton (sinon le coach, invisible derrière l'overlay, ne se voit jamais).
 */
const Z_BACKDROP_SOUS_COACH = 95;

/** Le bouton sous la fiche — le CTA d'achat du Bazar, à même le voile. */
const btnBase: CSSProperties = {
  width: "100%",
  minHeight: 46,
  marginTop: 14,
  padding: "12px 12px",
  fontFamily: "var(--font-display)",
  fontSize: 12,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  border: "1px solid var(--brass-500)",
  borderRadius: "var(--radius-btn)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  boxShadow: "0 6px 14px rgba(0,0,0,0.35)",
};

const noteText: CSSProperties = {
  marginTop: 12,
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.1em",
  color: "var(--brass-300)",
  textAlign: "center",
};

/**
 * L'ICÔNE DU RETRAIT — l'album de l'onglet Collection, et une flèche qui en
 * sort par le coin haut droit. Le pendant de « BookOpen + Plus » de l'ajout.
 */
function IconeRetirerCollection() {
  return (
    <span
      aria-hidden
      style={{
        position: "relative",
        display: "inline-flex",
        width: 22,
        height: 18,
      }}
    >
      <Album
        size={16}
        strokeWidth={1.6}
        style={{ position: "absolute", left: 0, bottom: 0 }}
      />
      <ArrowUpRight
        size={11}
        strokeWidth={2.4}
        style={{ position: "absolute", right: 0, top: -2 }}
      />
    </span>
  );
}

export function CollectionDetailOverlay({
  open,
  onClose,
  slot,
  candidatsCount,
  retirerDisabled = false,
  onAjouter,
  onRetirer,
  retirerInerte = false,
}: CollectionDetailOverlayProps) {
  const { d, tr, locale } = useLangue();
  if (!open || !slot) return null;
  const isDonne = slot.donation !== null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={d.inventaire.detailPiece}
      style={
        retirerInerte
          ? { ...ficheBackdrop, zIndex: Z_BACKDROP_SOUS_COACH }
          : ficheBackdrop
      }
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <FicheObjet
        templateId={slot.templateId}
        categorie={slot.categorie}
        nom={nomObjet(slot, locale)}
        rarete={slot.rarete}
        unique={!!slot.unique}
        etat={slot.donation?.etat}
        grise={!isDonne}
        prixMarche={
          slot.donation ? `${Math.round(slot.donation.valeur)} €` : null
        }
        prixAchat={slot.donation ? slot.donation.prixAchat : null}
        onClose={onClose}
      >
        {isDonne ? (
          <button
            type="button"
            data-tuto-coach="collection-retirer"
            onClick={retirerInerte || retirerDisabled ? undefined : onRetirer}
            disabled={retirerDisabled}
            aria-disabled={retirerInerte ? true : undefined}
            style={{
              ...btnBase,
              background: retirerDisabled
                ? "var(--paper-200)"
                : "var(--forest-800)",
              color: retirerDisabled ? "var(--ink-500)" : "var(--brass-300)",
              cursor: retirerDisabled ? "not-allowed" : "pointer",
              opacity: retirerDisabled ? 0.55 : 1,
            }}
          >
            <IconeRetirerCollection />
            {retirerDisabled
              ? d.qg.stockagePlein
              : d.inventaire.retirerDeCollection}
          </button>
        ) : (
          <>
            <div style={noteText}>
              {candidatsCount === 0
                ? d.inventaire.aucunCandidatPiece
                : tr(
                    candidatsCount > 1
                      ? d.inventaire.candidatsPiecePluriel
                      : d.inventaire.candidatsPieceUn,
                    { n: candidatsCount },
                  )}
            </div>
            <button
              type="button"
              onClick={candidatsCount === 0 ? undefined : onAjouter}
              disabled={candidatsCount === 0}
              style={{
                ...btnBase,
                marginTop: 10,
                background:
                  candidatsCount === 0
                    ? "var(--paper-200)"
                    : "var(--forest-800)",
                color:
                  candidatsCount === 0 ? "var(--ink-500)" : "var(--brass-300)",
                cursor: candidatsCount === 0 ? "not-allowed" : "pointer",
                opacity: candidatsCount === 0 ? 0.55 : 1,
              }}
            >
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <BookOpen size={16} strokeWidth={1.6} />
                <Plus size={12} strokeWidth={2} />
              </span>
              {d.inventaire.ajouterALaCollection}
            </button>
          </>
        )}
      </FicheObjet>
    </div>
  );
}
