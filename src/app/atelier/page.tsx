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
import { coutAmelioration, peutDemanteler, rendementDemantelement } from "@/lib/atelier";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { ArrowUp, Hammer, Pickaxe } from "lucide-react";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { AtelierItemRow } from "@/components/atelier/AtelierItemRow";
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
    return state.inventaireJoueur.filter((o) => peutDemanteler(state, o).disponible);
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
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 12,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--forest-800)",
                textAlign: "left",
              }}
            >
              Établi {enCours.length}/{ATELIER_SLOTS[state.niveauAtelier]}
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 14,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--brass-700)",
                textAlign: "center",
                whiteSpace: "nowrap",
              }}
            >
              — Atelier —
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              {(() => {
                const up = getProchaineUpgrade(state.niveauAtelier);
                if (!up) {
                  return (
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "var(--brass-700)",
                        padding: "6px 10px",
                      }}
                    >
                      MAX
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
                    aria-label={`Améliorer atelier vers LVL ${up.niveauCible} (${up.cout} €)`}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 1,
                      padding: "4px 10px",
                      border: "1px solid var(--brass-500)",
                      background: peut ? "var(--forest-800)" : "var(--paper-200)",
                      color: peut ? "var(--brass-300)" : "var(--ink-500)",
                      cursor: peut ? "pointer" : "not-allowed",
                      opacity: peut ? 1 : 0.6,
                      lineHeight: 1.1,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 9.5,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      <ArrowUp size={11} strokeWidth={2} />
                      LVL{up.niveauCible}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {up.cout} €
                    </span>
                  </button>
                );
              })()}
            </div>
          </div>
        </StickyTop>
      }
    >
      <PiecesInventoryBar pieces={state.piecesAmelioration} />

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
              <AtelierItemRow
                key={o.id}
                objet={o}
                isLast={i === enCours.length - 1}
                metaLigne={
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9.5,
                      color: "var(--ink-500)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {o.etat} → {o.enRestauration!.etatCible}
                    {" · "}
                    {ready ? "prêt ✓" : `fin jour N°${String(fin).padStart(3, "0")}`}
                  </span>
                }
                action={
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9.5,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: ready ? "var(--forest-700)" : "var(--brass-700)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ready ? "Prêt ✓" : `${restant} j. rest.`}
                  </span>
                }
              />
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
              <AtelierItemRow
                key={o.id}
                objet={o}
                isLast={i === restaurables.length - 1}
                metaLigne={
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9.5,
                      color: "var(--ink-500)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {o.etat} → {cible} · {duree} j. · réf. {o.prixReferenceReel} →{" "}
                    <span style={{ color: "var(--brass-700)" }}>{prixApres} €</span>
                  </div>
                }
                action={
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => handleRestaurer(o, cible)}
                    aria-label={`Lancer la restauration — coût ${cout} pièces ${o.categorie}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 10px",
                      border: "1px solid var(--brass-500)",
                      background: disabled
                        ? "var(--paper-200)"
                        : "var(--forest-800)",
                      color: disabled ? "var(--ink-500)" : "var(--brass-300)",
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: disabled ? 0.7 : 1,
                    }}
                  >
                    <Hammer size={18} strokeWidth={1.5} />
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        fontWeight: 700,
                        color: manquePieces
                          ? "var(--rouge-700, #8b1a1a)"
                          : "inherit",
                      }}
                    >
                      {cout}
                      <CategorieIcon
                        categorie={o.categorie}
                        size={12}
                        strokeWidth={1.6}
                        color="currentColor"
                      />
                    </span>
                  </button>
                }
              />
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
              <AtelierItemRow
                key={o.id}
                objet={o}
                isLast={i === demantelables.length - 1}
                metaLigne={
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9.5,
                      color: "var(--ink-500)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    réf. {o.prixReferenceReel} €
                  </span>
                }
                action={
                  <button
                    type="button"
                    onClick={() => setDemantelerCible(o)}
                    aria-label={`Démanteler — rendement ${yieldPieces} pièces ${o.categorie}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 10px",
                      border: "1px solid var(--brass-500)",
                      background: "var(--brass-600)",
                      color: "var(--paper-100)",
                      cursor: "pointer",
                    }}
                  >
                    <Pickaxe size={18} strokeWidth={1.5} />
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      +{yieldPieces}
                      <CategorieIcon
                        categorie={o.categorie}
                        size={12}
                        strokeWidth={1.6}
                        color="currentColor"
                      />
                    </span>
                  </button>
                }
              />
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
