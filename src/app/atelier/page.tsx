"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBar } from "@/components/StatusBar";
import { Button } from "@/components/ui/Button";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { DecoDivider } from "@/components/ui/DecoDivider";
import { EtatBadge } from "@/components/ui/EtatBadge";
import { Panel } from "@/components/ui/Panel";
import { useGame } from "@/context/GameContext";
import {
  dureeRestauration,
  peutRestaurerBonVersTresBon,
  peutRestaurerCategorie,
  peutRestaurerTresBonVersPristin,
} from "@/lib/competences";
import { etatSuivant, recalculerPrixReference } from "@/lib/etat";
import type { EtatObjet, Objet } from "@/types/game";

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

  if (!isHydrated || !state) {
    return (
      <main
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          fontFamily: "var(--font-mono)",
          color: "var(--ink-500)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
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
    if (res.ok) {
      setFlash(
        `${objet.nom} mis en restauration — ${cible} dans ${duree} jour${duree > 1 ? "s" : ""}.`,
      );
    } else {
      setFlash(res.raison ?? "Restauration impossible.");
    }
  };

  return (
    <div
      className="bg-paper-grain"
      style={{ minHeight: "100dvh", padding: "20px 28px 32px" }}
    >
      <StatusBar jour={state.jourActuel} budget={state.budget} />

      <div
        style={{
          maxWidth: 1100,
          margin: "32px auto 0",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <header
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 16,
          }}
        >
          <div>
            <div className="eyebrow">— atelier —</div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 36,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--forest-800)",
                margin: "4px 0 8px",
                lineHeight: 1.1,
              }}
            >
              Restauration
            </h1>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                color: "var(--ink-500)",
                fontSize: 16,
                margin: 0,
                maxWidth: 540,
              }}
            >
              Vous ne pouvez restaurer que les catégories pour lesquelles vous
              avez la compétence « Réparer ». La restauration met l'objet en
              attente pendant la durée du chantier.
            </p>
          </div>
          <Link href="/qg">
            <Button variant="ghost" size="sm">
              ← Retour au QG
            </Button>
          </Link>
        </header>

        <DecoDivider />

        {flash && (
          <div
            style={{
              padding: "12px 16px",
              background: "var(--paper-100)",
              border: "1px solid var(--brass-500)",
              boxShadow:
                "inset 0 0 0 3px var(--paper-100), inset 0 0 0 4px var(--brass-700)",
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 15,
              color: "var(--ink-700)",
            }}
          >
            « {flash} »
          </div>
        )}

        {enCours.length > 0 && (
          <Panel
            eyebrow={`— chantier en cours · ${enCours.length} pièce${enCours.length > 1 ? "s" : ""} —`}
            title="Atelier occupé"
            dark
          >
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 14px" }}>
              {enCours.map((o, i) => {
                const r = o.enRestauration!;
                const restant = Math.max(1, r.jourFin - state.jourActuel);
                return (
                  <li
                    key={o.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 0",
                      borderBottom:
                        i < enCours.length - 1
                          ? "1px dotted var(--brass-700)"
                          : "none",
                    }}
                  >
                    <CategorieIcon
                      categorie={o.categorie}
                      size={18}
                      color="var(--brass-300)"
                    />
                    <div>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 13,
                          fontWeight: 600,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--brass-100)",
                        }}
                      >
                        {o.nom}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          fontFamily: "var(--font-mono)",
                          fontSize: 10.5,
                          letterSpacing: "0.1em",
                          color: "var(--brass-300)",
                        }}
                      >
                        {o.etat} → {r.etatCible} · fin jour N°
                        {String(r.jourFin).padStart(3, "0")}
                      </div>
                    </div>
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: 16,
                        color: "var(--brass-100)",
                      }}
                    >
                      {restant}j
                    </span>
                  </li>
                );
              })}
            </ul>

            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: 13,
                color: "var(--brass-300)",
                textAlign: "center",
                margin: 0,
              }}
            >
              Les jours passeront au fil de vos sorties à la chine et de vos
              journées de vente.
            </p>
          </Panel>
        )}

        <Panel
          eyebrow="— pièces sur l'établi —"
          title={`Inventaire · ${state.inventaireJoueur.length}`}
        >
          {state.inventaireJoueur.length === 0 ? (
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                color: "var(--ink-500)",
                textAlign: "center",
                padding: "30px 0",
              }}
            >
              L'établi est nu. Partez chiner pour le garnir.
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {state.inventaireJoueur.map((o, i, arr) => {
                const cible = etatSuivant(o.etat);
                const enRest = o.enRestauration !== undefined;
                // Vérifier la compétence pour la prochaine étape spécifiquement
                const peut =
                  cible === null
                    ? false
                    : cible === "Bon"
                      ? peutRestaurerCategorie(state, o.categorie)
                      : cible === "Très bon"
                        ? peutRestaurerBonVersTresBon(state, o.categorie)
                        : cible === "Pristin état"
                          ? peutRestaurerTresBonVersPristin(state, o.categorie)
                          : false;
                const duree = dureeRestauration(state, o.categorie);
                return (
                  <li
                    key={o.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      alignItems: "center",
                      gap: 14,
                      padding: "12px 0",
                      borderBottom:
                        i < arr.length - 1
                          ? "1px dotted var(--paper-500)"
                          : "none",
                      opacity: enRest ? 0.55 : 1,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <CategorieIcon
                          categorie={o.categorie}
                          size={16}
                          color="var(--brass-700)"
                        />
                        <span
                          style={{
                            fontFamily: "var(--font-display)",
                            fontWeight: 600,
                            fontSize: 14,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "var(--forest-800)",
                          }}
                        >
                          {o.nom}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                          marginTop: 5,
                          flexWrap: "wrap",
                          fontFamily: "var(--font-mono)",
                          fontSize: 10.5,
                          color: "var(--ink-500)",
                        }}
                      >
                        <EtatBadge etat={o.etat} />
                        <span>{o.categorie}</span>
                        <span>· réf. {o.prixReferenceReel} €</span>
                        {cible && (
                          <span style={{ color: "var(--brass-700)" }}>
                            → {recalculerPrixReference(o.prixReferenceReel, o.etat, cible)} €
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      {enRest ? (
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            letterSpacing: "0.16em",
                            textTransform: "uppercase",
                            color: "var(--brass-700)",
                            fontStyle: "italic",
                          }}
                        >
                          en chantier · jour {o.enRestauration!.jourFin}
                        </span>
                      ) : cible === null ? (
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            letterSpacing: "0.16em",
                            textTransform: "uppercase",
                            color: "var(--brass-700)",
                            fontStyle: "italic",
                          }}
                        >
                          parfait
                        </span>
                      ) : peut ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleRestaurer(o, cible)}
                        >
                          Restaurer · {cible} · {duree}j
                        </Button>
                      ) : (
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            letterSpacing: "0.16em",
                            textTransform: "uppercase",
                            color: "var(--vermillion-600)",
                            fontStyle: "italic",
                          }}
                        >
                          compétence manquante
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
