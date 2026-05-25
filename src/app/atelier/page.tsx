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
  const { state, isHydrated, restaurerObjet } = useGame();
  const [flash, setFlash] = useState<string | null>(null);

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

  const handleRestaurer = (objet: Objet, cible: EtatObjet) => {
    const duree = dureeRestauration(state, objet.categorie);
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
              {enCours.length} en chantier
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
            const duree = dureeRestauration(state, o.categorie);
            const prixApres = recalculerPrixReference(
              o.prixReferenceReel,
              o.etat,
              cible,
            );
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
                </div>
                <button
                  type="button"
                  onClick={() => handleRestaurer(o, cible)}
                  style={{
                    padding: "6px 10px",
                    fontFamily: "var(--font-display)",
                    fontSize: 9.5,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    border: "1px solid var(--brass-500)",
                    background: "var(--forest-800)",
                    color: "var(--brass-300)",
                    cursor: "pointer",
                  }}
                >
                  Lancer
                </button>
              </div>
            );
          })}
        </div>
      )}
    </MobileLayout>
  );
}
