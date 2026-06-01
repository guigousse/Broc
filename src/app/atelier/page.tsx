"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { StickyTop } from "@/components/mobile/StickyTop";
import { useGame } from "@/context/GameContext";
import {
  dureeRestauration,
  peutRestaurerBonVersTresBon,
  peutRestaurerMauvaisVersBon,
  peutRestaurerTresBonVersPristin,
} from "@/lib/competences";
import { recalculerPrixReference } from "@/lib/etat";
import { ATELIER_SLOTS, getProchaineUpgrade } from "@/data/atelier";
import { coutAmelioration, rendementDemantelement } from "@/lib/atelier";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { PiecesInventoryBar } from "@/components/atelier/PiecesInventoryBar";
import type { EtatObjet, Objet } from "@/types/game";

const sectTitle: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--forest-800)",
  margin: "10px 2px 6px",
};

const cardWrap: React.CSSProperties = {
  border: "1px solid var(--brass-500)",
  background: "var(--paper-100)",
  padding: "8px 12px",
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
};

export default function AtelierPage() {
  const router = useRouter();
  const { state, isHydrated, restaurerObjet, ameliorerAtelier, demantelerObjet } = useGame();
  const [flash, setFlash] = useState<string | null>(null);
  const [demantelerCible, setDemantelerCible] = useState<Objet | null>(null);

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  const enCours = useMemo(
    () => state?.inventaireJoueur.filter((o) => o.enRestauration) ?? [],
    [state],
  );
  const prets = useMemo(
    () =>
      enCours.filter(
        (o) => (o.enRestauration?.jourFin ?? Infinity) <= (state?.jourActuel ?? 0),
      ),
    [enCours, state],
  );
  const restaurables = useMemo(() => {
    if (!state) return [];
    return state.inventaireJoueur.filter(
      (o) =>
        !o.enRestauration &&
        ((o.etat === "Mauvais" &&
          peutRestaurerMauvaisVersBon(state, o.categorie)) ||
          (o.etat === "Bon" &&
            peutRestaurerBonVersTresBon(state, o.categorie)) ||
          (o.etat === "Très bon" &&
            peutRestaurerTresBonVersPristin(state, o.categorie))),
    );
  }, [state]);
  const demantelables = useMemo(() => {
    if (!state) return [];
    return state.inventaireJoueur.filter((o) => !o.enRestauration);
  }, [state]);

  if (!isHydrated || !state) {
    return (
      <main
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          fontFamily: "var(--font-mono)",
          color: "var(--ink-500)",
          fontSize: 12,
        }}
      >
        — préparation de l'établi…
      </main>
    );
  }

  const pleine = enCours.length >= ATELIER_SLOTS[state.niveauAtelier];

  const handleConfirmDemanteler = () => {
    if (!demantelerCible) return;
    const res = demantelerObjet(demantelerCible.id);
    if (res.ok) {
      setFlash(`${demantelerCible.nom} démantelé · +${res.pieces} ⚙ ${demantelerCible.categorie}.`);
    } else {
      setFlash(`Impossible : ${res.raison ?? "condition non remplie"}`);
    }
    setDemantelerCible(null);
    setTimeout(() => setFlash(null), 2500);
  };

  const handleRestaurer = (objet: Objet, cible: EtatObjet) => {
    const duree = dureeRestauration(state, objet.categorie, cible);
    const res = restaurerObjet(objet.id, cible, { dureeJours: duree });
    if (res.ok)
      setFlash(`${objet.nom} en restauration · ${cible} dans ${duree} j.`);
    else setFlash(`Impossible : ${res.raison ?? "condition non remplie"}`);
    setTimeout(() => setFlash(null), 2500);
  };

  return (
    <MobileLayout
      header={<MobileHeader jour={state.jourActuel} budget={state.budget} />}
      stickyTop={
        <StickyTop>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 9,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "var(--brass-700)",
              textAlign: "center",
              marginBottom: 6,
            }}
          >
            — Atelier · Établi —
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 15,
                color: "var(--forest-800)",
              }}
            >
              {enCours.length} / {ATELIER_SLOTS[state.niveauAtelier]} en chantier
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color:
                  prets.length > 0 ? "var(--forest-700)" : "var(--brass-700)",
              }}
            >
              {prets.length > 0
                ? `${prets.length} prêt${prets.length > 1 ? "s" : ""}`
                : "—"}
            </span>
          </div>
        </StickyTop>
      }
    >
      <PiecesInventoryBar pieces={state.piecesAmelioration} />
          <div
            style={{
              border: "1px solid var(--brass-500)",
              background: "var(--paper-100)",
              padding: "10px 14px",
              boxShadow:
                "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-500)",
              marginBottom: 10,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 11,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--forest-800)",
                }}
              >
                Atelier LVL {state.niveauAtelier}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9.5,
                  color: "var(--ink-500)",
                  marginTop: 1,
                }}
              >
                {ATELIER_SLOTS[state.niveauAtelier]} slot
                {ATELIER_SLOTS[state.niveauAtelier] > 1 ? "s" : ""}
              </div>
            </div>
            {(() => {
              const up = getProchaineUpgrade(state.niveauAtelier);
              if (!up) {
                return (
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9.5,
                      color: "var(--brass-700)",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    Maximum
                  </span>
                );
              }
              const peut = state.budget >= up.cout;
              return (
                <button
                  type="button"
                  disabled={!peut}
                  onClick={() => {
                    const res = ameliorerAtelier();
                    if (!res.ok) setFlash(res.raison ?? "Impossible");
                    else setFlash(`Atelier amélioré au LVL ${up.niveauCible}.`);
                    setTimeout(() => setFlash(null), 2500);
                  }}
                  style={{
                    padding: "8px 12px",
                    fontFamily: "var(--font-display)",
                    fontSize: 10.5,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    border: "1px solid var(--brass-500)",
                    background: peut ? "var(--forest-800)" : "var(--paper-200)",
                    color: peut ? "var(--brass-300)" : "var(--ink-500)",
                    cursor: peut ? "pointer" : "not-allowed",
                    opacity: peut ? 1 : 0.6,
                  }}
                >
                  LVL {up.niveauCible} · {up.cout} €
                </button>
              );
            })()}
          </div>

      {flash && (
        <div
          style={{
            padding: "10px 12px",
            background: "var(--brass-100)",
            border: "1px solid var(--brass-700)",
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 12.5,
            color: "var(--ink-700)",
            marginBottom: 8,
          }}
        >
          « {flash} »
        </div>
      )}

      <h2 style={sectTitle}>— Travaux en cours —</h2>
      {enCours.length === 0 ? (
        <div style={cardWrap}>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              color: "var(--ink-500)",
              textAlign: "center",
              padding: "12px 0",
            }}
          >
            Aucun chantier. L'établi est libre.
          </p>
        </div>
      ) : (
        <div style={cardWrap}>
          {enCours.map((o, i) => {
            const fin = o.enRestauration!.jourFin;
            const restant = Math.max(0, fin - state.jourActuel);
            const ready = state.jourActuel >= fin;
            return (
              <div
                key={o.id}
                style={{
                  padding: "10px 0",
                  borderBottom:
                    i === enCours.length - 1
                      ? "none"
                      : "1px dotted var(--paper-500)",
                }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span
                    style={{
                      flex: 1,
                      fontFamily: "var(--font-display)",
                      fontSize: 11,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--forest-800)",
                      fontWeight: 700,
                    }}
                  >
                    {o.nom}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9.5,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: ready ? "var(--forest-700)" : "var(--brass-700)",
                    }}
                  >
                    {ready ? "Prêt ✓" : `${restant} j. rest.`}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    fontSize: 12,
                    color: "var(--ink-500)",
                  }}
                >
                  {o.etat} → {o.enRestauration!.etatCible}
                  {" · "}fin jour N°{String(fin).padStart(3, "0")}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <h2 style={sectTitle}>— Restaurations possibles —</h2>
      {restaurables.length === 0 ? (
        <div style={cardWrap}>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              color: "var(--ink-500)",
              textAlign: "center",
              padding: "12px 0",
            }}
          >
            Aucun objet restaurable. Acquérez la compétence requise ou
            rapportez du stock.
          </p>
        </div>
      ) : (
        <div style={cardWrap}>
          {restaurables.map((o, i) => {
            const cible: EtatObjet =
              o.etat === "Mauvais"
                ? "Bon"
                : o.etat === "Bon"
                  ? "Très bon"
                  : "Pristin état";
            const duree = dureeRestauration(state, o.categorie, cible);
            const prixApres = recalculerPrixReference(
              o.prixReferenceReel,
              o.etat,
              cible,
            );
            const cout = coutAmelioration(o, cible);
            const dispo = state.piecesAmelioration[o.categorie] ?? 0;
            const manquePieces = dispo < cout;
            const disabled = pleine || manquePieces;
            return (
              <div
                key={o.id}
                style={{
                  padding: "10px 0",
                  borderBottom:
                    i === restaurables.length - 1
                      ? "none"
                      : "1px dotted var(--paper-500)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 11,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--forest-800)",
                      fontWeight: 700,
                    }}
                  >
                    {o.nom}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9.5,
                      color: "var(--ink-500)",
                      marginTop: 2,
                    }}
                  >
                    {o.etat} → {cible} · {duree} j.
                    {" · "}réf. {o.prixReferenceReel} →{" "}
                    <span style={{ color: "var(--brass-700)" }}>
                      {prixApres} €
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9.5,
                      color: manquePieces ? "var(--rouge-700, #8b1a1a)" : "var(--brass-700)",
                      marginTop: 2,
                      letterSpacing: "0.04em",
                    }}
                  >
                    coût : {cout} ⚙ {o.categorie}
                    {manquePieces ? ` · manque ${cout - dispo}` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => handleRestaurer(o, cible)}
                  style={{
                    padding: "6px 10px",
                    fontFamily: "var(--font-display)",
                    fontSize: 9.5,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    border: "1px solid var(--brass-500)",
                    background: disabled ? "var(--paper-200)" : "var(--forest-800)",
                    color: disabled ? "var(--ink-500)" : "var(--brass-300)",
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.6 : 1,
                  }}
                >
                  Lancer
                </button>
              </div>
            );
          })}
        </div>
      )}
      <h2 style={sectTitle}>— Démantèlement —</h2>
      {demantelables.length === 0 ? (
        <div style={cardWrap}>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              color: "var(--ink-500)",
              textAlign: "center",
              padding: "12px 0",
            }}
          >
            Aucun objet à démanteler en stock.
          </p>
        </div>
      ) : (
        <div style={cardWrap}>
          {demantelables.map((o, i) => {
            const yieldPieces = rendementDemantelement(o);
            return (
              <div
                key={o.id}
                style={{
                  padding: "10px 0",
                  borderBottom:
                    i === demantelables.length - 1
                      ? "none"
                      : "1px dotted var(--paper-500)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 11,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--forest-800)",
                      fontWeight: 700,
                    }}
                  >
                    {o.nom}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9.5,
                      color: "var(--ink-500)",
                      marginTop: 2,
                    }}
                  >
                    {o.etat} · réf. {o.prixReferenceReel} €
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9.5,
                      color: "var(--brass-700)",
                      marginTop: 2,
                      letterSpacing: "0.04em",
                    }}
                  >
                    rendement : {yieldPieces} ⚙ {o.categorie}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDemantelerCible(o)}
                  style={{
                    padding: "6px 10px",
                    fontFamily: "var(--font-display)",
                    fontSize: 9.5,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    border: "1px solid var(--brass-500)",
                    background: "var(--paper-100)",
                    color: "var(--forest-800)",
                    cursor: "pointer",
                  }}
                >
                  Démanteler
                </button>
              </div>
            );
          })}
        </div>
      )}

      <BottomSheet
        open={demantelerCible !== null}
        onClose={() => setDemantelerCible(null)}
        title="Démantèlement"
      >
        {demantelerCible && (
          <div style={{ padding: "8px 16px 16px" }}>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 13,
                color: "var(--ink-700)",
                marginBottom: 10,
              }}
            >
              Démanteler <strong>{demantelerCible.nom}</strong> rend{" "}
              <strong>{rendementDemantelement(demantelerCible)} ⚙ {demantelerCible.categorie}</strong>.
              L'objet sera détruit définitivement.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setDemantelerCible(null)}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  fontFamily: "var(--font-display)",
                  fontSize: 10.5,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  border: "1px solid var(--brass-500)",
                  background: "var(--paper-200)",
                  color: "var(--ink-700)",
                  cursor: "pointer",
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDemanteler}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  fontFamily: "var(--font-display)",
                  fontSize: 10.5,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  border: "1px solid var(--brass-500)",
                  background: "var(--forest-800)",
                  color: "var(--brass-300)",
                  cursor: "pointer",
                }}
              >
                Démanteler
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </MobileLayout>
  );
}
