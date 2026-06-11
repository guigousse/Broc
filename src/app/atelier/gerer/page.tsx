"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { PageHeaderBar } from "@/components/mobile/PageHeaderBar";
import { UpgradeButton } from "@/components/mobile/UpgradeButton";
import { AtelierItemRow } from "@/components/atelier/AtelierItemRow";
import { PiecesInventoryBar } from "@/components/atelier/PiecesInventoryBar";
import { PieceIcon } from "@/components/atelier/PieceIcon";
import type { EtatObjet, Objet } from "@/types/game";
import { audioManager } from "@/lib/audio/audioManager";
import { getRarityColors } from "@/lib/rarityColors";
import { getItemImageUrl } from "@/lib/itemImages";
import { getTemplate } from "@/data/objetTemplates";

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
  const [restaurerCible, setRestaurerCible] = useState<{
    objet: Objet;
    etatCible: EtatObjet;
    cout: number;
    thumbRect: DOMRect | null;
  } | null>(null);
  const [demantelerCible, setDemantelerCible] = useState<{
    objet: Objet;
    yieldPieces: number;
    thumbRect: DOMRect | null;
  } | null>(null);
  const [onglet, setOnglet] = useState<"restaurations" | "demantelement">(
    "restaurations",
  );
  const actionEnCoursRef = useRef(false);

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  const enCours = useMemo(
    () => state?.inventaireJoueur.filter((o) => o.enRestauration) ?? [],
    [state],
  );
  const restaurables = useMemo(() => {
    if (!state) return [];
    return state.inventaireJoueur.filter((o) => {
      if (o.enRestauration) return false;
      const cible: EtatObjet | null =
        o.etat === "Mauvais"
          ? "Bon"
          : o.etat === "Bon"
            ? "Très bon"
            : o.etat === "Très bon"
              ? "Pristin état"
              : null;
      if (!cible) return false;
      const peutCompetence =
        (o.etat === "Mauvais" &&
          peutRestaurerMauvaisVersBon(state, o.categorie)) ||
        (o.etat === "Bon" &&
          peutRestaurerBonVersTresBon(state, o.categorie)) ||
        (o.etat === "Très bon" &&
          peutRestaurerTresBonVersPristin(state, o.categorie));
      if (!peutCompetence) return false;
      const cout = coutAmelioration(o, cible);
      const dispo = state.piecesAmelioration[o.categorie] ?? 0;
      return dispo >= cout;
    });
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
    if (actionEnCoursRef.current) return;
    actionEnCoursRef.current = true;
    const { objet, yieldPieces, thumbRect } = demantelerCible;
    void audioManager.playBreak();
    setDemantelerCible(null);
    const rowEl = document.querySelector(
      `[data-objet-id="${objet.id}"]`,
    ) as HTMLElement | null;
    if (rowEl) {
      rowEl.style.transition = "opacity 250ms ease-in";
      rowEl.style.opacity = "0";
    }
    if (thumbRect) {
      const target = document.querySelector(
        `[data-fly-target="piece-${objet.categorie}"]`,
      ) as HTMLElement | null;
      if (target) {
        const toRect = target.getBoundingClientRect();
        const clone = document.createElement("div");
        const COG_SIZE = 28;
        Object.assign(clone.style, {
          position: "fixed",
          left: `${thumbRect.left + thumbRect.width / 2 - COG_SIZE / 2}px`,
          top: `${thumbRect.top + thumbRect.height / 2 - COG_SIZE / 2}px`,
          width: `${COG_SIZE}px`,
          height: `${COG_SIZE}px`,
          borderRadius: "50%",
          background: "var(--paper-100)",
          border: "1.5px solid var(--brass-700)",
          boxShadow: "0 4px 10px rgba(40,25,5,0.30)",
          zIndex: "9999",
          pointerEvents: "none",
          transition:
            "left 620ms cubic-bezier(0.55,0,0.45,1), top 620ms cubic-bezier(0.45,0,0.55,1), opacity 250ms ease-in 400ms, transform 620ms ease-in-out",
        });
        document.body.appendChild(clone);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            clone.style.left = `${toRect.left + toRect.width / 2 - COG_SIZE / 2}px`;
            clone.style.top = `${toRect.top + toRect.height / 2 - COG_SIZE / 2}px`;
            clone.style.transform = "scale(0.6) rotate(-90deg)";
            clone.style.opacity = "0";
          });
        });
        window.setTimeout(() => {
          clone.remove();
          target.classList.remove("broc-pulse-once");
          void target.offsetWidth;
          target.classList.add("broc-pulse-once");
          void audioManager.playPickup();
          window.setTimeout(
            () => target.classList.remove("broc-pulse-once"),
            650,
          );
        }, 620);
      }
    }
    window.setTimeout(() => {
      const res = demantelerObjet(objet.id);
      if (res.ok) {
        setFlash(
          `${objet.nom} démantelé · +${res.pieces} ⚙ ${objet.categorie}.`,
        );
      } else {
        setFlash(`Impossible : ${res.raison ?? "condition non remplie"}`);
      }
      setTimeout(() => setFlash(null), 2500);
      actionEnCoursRef.current = false;
    }, 620);
  };

  const handleConfirmRestaurer = () => {
    if (!restaurerCible) return;
    if (actionEnCoursRef.current) return;
    actionEnCoursRef.current = true;
    const { objet, etatCible, thumbRect } = restaurerCible;
    const duree = dureeRestauration(state, objet.categorie, etatCible);
    void audioManager.playRepair();
    setRestaurerCible(null);
    if (thumbRect) {
      const target = document.querySelector(
        '[data-fly-target="travaux"]',
      ) as HTMLElement | null;
      if (target) {
        const toRect = target.getBoundingClientRect();
        const isUnique = !!getTemplate(objet.templateId)?.unique;
        const rarity = getRarityColors(objet.rarete, isUnique);
        const clone = document.createElement("div");
        Object.assign(clone.style, {
          position: "fixed",
          left: `${thumbRect.left}px`,
          top: `${thumbRect.top}px`,
          width: `${thumbRect.width}px`,
          height: `${thumbRect.height}px`,
          background: rarity.thumbBg,
          border: `1.5px solid ${rarity.outer}`,
          boxSizing: "border-box",
          zIndex: "9999",
          pointerEvents: "none",
          boxShadow:
            "0 8px 18px rgba(0,0,0,0.35), 0 2px 4px rgba(0,0,0,0.25)",
          transition:
            "left 620ms cubic-bezier(0.55,0,0.45,1), top 620ms cubic-bezier(0.45,0,0.55,1), width 620ms ease-in, height 620ms ease-in, opacity 620ms ease-in",
        });
        const imgUrl = getItemImageUrl(objet.templateId);
        if (imgUrl) {
          clone.style.backgroundImage = `url(${imgUrl})`;
          clone.style.backgroundSize = "cover";
          clone.style.backgroundPosition = "center";
        }
        document.body.appendChild(clone);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const SZ = 18;
            clone.style.left = `${toRect.left + toRect.width / 2 - SZ / 2}px`;
            clone.style.top = `${toRect.top + toRect.height / 2 - SZ / 2}px`;
            clone.style.width = `${SZ}px`;
            clone.style.height = `${SZ}px`;
            clone.style.opacity = "0.4";
          });
        });
        window.setTimeout(() => clone.remove(), 640);
      }
    }
    window.setTimeout(() => {
      const res = restaurerObjet(objet.id, etatCible, { dureeJours: duree });
      if (res.ok) {
        setFlash(`${objet.nom} en restauration · ${etatCible} dans ${duree} j.`);
      } else {
        setFlash(`Impossible : ${res.raison ?? "condition non remplie"}`);
      }
      setTimeout(() => setFlash(null), 2500);
      actionEnCoursRef.current = false;
    }, 620);
  };

  return (
    <MobileLayout
      header={<MobileHeader budget={state.budget} />}
      stickyTop={
        <StickyTop>
          <PageHeaderBar
            title="Atelier"
            left={
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 12,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "var(--forest-800)",
                }}
              >
                Établi {enCours.length}/{ATELIER_SLOTS[state.niveauAtelier]}
              </div>
            }
            right={(() => {
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
              return (
                <UpgradeButton
                  niveauCible={up.niveauCible}
                  cout={up.cout}
                  peut={state.budget >= up.cout}
                  onUpgrade={() => {
                    const res = ameliorerAtelier();
                    if (!res.ok) setFlash(res.raison ?? "Impossible");
                    else
                      setFlash(`Atelier amélioré au LVL ${up.niveauCible}.`);
                    setTimeout(() => setFlash(null), 2500);
                  }}
                  ariaLabel={`Améliorer atelier vers LVL ${up.niveauCible} (${up.cout} €)`}
                />
              );
            })()}
          />
          <div style={{ marginTop: 4 }}>
            <PiecesInventoryBar pieces={state.piecesAmelioration} />
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

      <h2 style={sectTitle} data-fly-target="travaux">— Travaux en cours —</h2>
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
                    {ready ? "prêt ✓" : `fin jour N°${String(fin).padStart(3, "0")}`}
                  </span>
                }
                action={
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 4,
          marginTop: 14,
          marginBottom: 6,
        }}
      >
        <button
          type="button"
          onClick={() => setOnglet("restaurations")}
          aria-pressed={onglet === "restaurations"}
          style={{
            padding: "8px 12px",
            border: "1px solid var(--brass-500)",
            background:
              onglet === "restaurations"
                ? "var(--forest-800)"
                : "var(--paper-100)",
            color:
              onglet === "restaurations"
                ? "var(--brass-300)"
                : "var(--ink-500)",
            fontFamily: "var(--font-display)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Restaurations
        </button>
        <button
          type="button"
          onClick={() => setOnglet("demantelement")}
          aria-pressed={onglet === "demantelement"}
          style={{
            padding: "8px 12px",
            border: "1px solid var(--brass-500)",
            background:
              onglet === "demantelement"
                ? "var(--forest-800)"
                : "var(--paper-100)",
            color:
              onglet === "demantelement"
                ? "var(--brass-300)"
                : "var(--ink-500)",
            fontFamily: "var(--font-display)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Démantèlement
        </button>
      </div>

      {onglet === "restaurations" ? (
        restaurables.length === 0 ? (
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
              Aucune pièce à restaurer.
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
              const disabled = pleine;
              return (
                <AtelierItemRow
                  key={o.id}
                  objet={o}
                  etatCible={cible}
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
                      {duree} j. · valeur {o.prixReferenceReel} →{" "}
                      <span style={{ color: "var(--brass-700)" }}>
                        {prixApres} €
                      </span>
                    </div>
                  }
                  action={
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={(e) => {
                        const rowEl = (e.currentTarget as HTMLElement).closest(
                          "[data-atelier-row]",
                        ) as HTMLElement | null;
                        const thumb = rowEl?.querySelector(
                          "[data-atelier-thumb]",
                        ) as HTMLElement | null;
                        setRestaurerCible({
                          objet: o,
                          etatCible: cible,
                          cout,
                          thumbRect: thumb?.getBoundingClientRect() ?? null,
                        });
                      }}
                      aria-label={`Confirmer la restauration — coût ${cout} pièces ${o.categorie}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "4px 6px",
                        border: "1px solid var(--brass-500)",
                        background: disabled
                          ? "var(--paper-200)"
                          : "var(--forest-800)",
                        color: disabled
                          ? "var(--ink-500)"
                          : "var(--brass-300)",
                        cursor: disabled ? "not-allowed" : "pointer",
                        opacity: disabled ? 0.7 : 1,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        −{cout}
                      </span>
                      <PieceIcon categorie={o.categorie} size={22} />
                    </button>
                  }
                />
              );
            })}
          </div>
        )
      ) : demantelables.length === 0 ? (
        <div style={{ ...cardWrap, borderColor: "var(--vermillion-600)" }}>
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
        <div style={{ ...cardWrap, borderColor: "var(--vermillion-600)" }}>
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
                    valeur {o.prixReferenceReel} €
                  </span>
                }
                action={
                  <button
                    type="button"
                    onClick={(e) => {
                      const rowEl = (e.currentTarget as HTMLElement).closest(
                        "[data-atelier-row]",
                      ) as HTMLElement | null;
                      const thumb = rowEl?.querySelector(
                        "[data-atelier-thumb]",
                      ) as HTMLElement | null;
                      setDemantelerCible({
                        objet: o,
                        yieldPieces,
                        thumbRect: thumb?.getBoundingClientRect() ?? null,
                      });
                    }}
                    aria-label={`Démanteler — rendement ${yieldPieces} pièces ${o.categorie}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "4px 6px",
                      border: "1px solid var(--brass-500)",
                      background: "var(--brass-600)",
                      color: "var(--paper-100)",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      +{yieldPieces}
                    </span>
                    <PieceIcon categorie={o.categorie} size={22} />
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
              Démanteler <strong>{demantelerCible.objet.nom}</strong> rend{" "}
              <strong>
                {demantelerCible.yieldPieces} ⚙{" "}
                {demantelerCible.objet.categorie}
              </strong>
              . L'objet sera détruit définitivement.
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
      <BottomSheet
        open={restaurerCible !== null}
        onClose={() => setRestaurerCible(null)}
        title="Restauration"
      >
        {restaurerCible && (
          <div style={{ padding: "8px 16px 16px" }}>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 13,
                color: "var(--ink-700)",
                marginBottom: 10,
              }}
            >
              Restaurer <strong>{restaurerCible.objet.nom}</strong> en{" "}
              <strong>{restaurerCible.etatCible}</strong> prend{" "}
              <strong>
                {dureeRestauration(
                  state,
                  restaurerCible.objet.categorie,
                  restaurerCible.etatCible,
                )}{" "}
                jours
              </strong>{" "}
              et coûte{" "}
              <strong>
                {restaurerCible.cout} ⚙ {restaurerCible.objet.categorie}
              </strong>
              .
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setRestaurerCible(null)}
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
                onClick={handleConfirmRestaurer}
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
                Confirmer
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </MobileLayout>
  );
}
