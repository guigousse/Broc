"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBar } from "@/components/StatusBar";
import { Button } from "@/components/ui/Button";
import { DecoDivider } from "@/components/ui/DecoDivider";
import { EtatBadge } from "@/components/ui/EtatBadge";
import { Panel } from "@/components/ui/Panel";
import { useGame } from "@/context/GameContext";
import type {
  Session,
  SessionChinage,
  SessionVente,
} from "@/types/game";

export default function HistoriquePage() {
  const router = useRouter();
  const { state, isHydrated } = useGame();
  const [selectionId, setSelectionId] = useState<string | null>(null);

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  const sessions = state?.historique ?? [];
  const selection = useMemo(
    () => sessions.find((s) => s.id === selectionId) ?? null,
    [sessions, selectionId],
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
        — consultation du registre…
      </main>
    );
  }

  return (
    <div
      className="bg-paper-grain"
      style={{ minHeight: "100dvh", padding: "20px 28px 32px" }}
    >
      <StatusBar jour={state.jourActuel} budget={state.budget} />

      <div
        style={{
          maxWidth: 960,
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
            <div className="eyebrow">— le carnet de comptes —</div>
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
              Historique
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
              Toutes vos sorties à la chine et journées de vente, consignées
              jour après jour.
            </p>
          </div>
          <Link href="/qg">
            <Button variant="ghost" size="sm">
              ← Retour au QG
            </Button>
          </Link>
        </header>

        <DecoDivider />

        <Panel
          eyebrow="— registre —"
          title={`${sessions.length} session${sessions.length > 1 ? "s" : ""}`}
        >
          {sessions.length === 0 ? (
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: 16,
                color: "var(--ink-500)",
                textAlign: "center",
                padding: "24px 0",
              }}
            >
              Le carnet est encore vierge. Vos premières sessions y seront
              inscrites.
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {sessions.map((s, i) => (
                <SessionRow
                  key={s.id}
                  session={s}
                  last={i === sessions.length - 1}
                  onClick={() => setSelectionId(s.id)}
                />
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {selection && (
        <SessionDetailModal
          session={selection}
          onClose={() => setSelectionId(null)}
        />
      )}
    </div>
  );
}

function SessionRow({
  session,
  last,
  onClick,
}: {
  session: Session;
  last: boolean;
  onClick: () => void;
}) {
  if (session.type === "chinage") return <ChinageRow session={session} last={last} onClick={onClick} />;
  return <VenteRow session={session} last={last} onClick={onClick} />;
}

function rowBaseStyle(last: boolean): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "auto 1fr auto",
    alignItems: "center",
    gap: 14,
    padding: "12px 4px",
    cursor: "pointer",
    borderBottom: last ? "none" : "1px dotted var(--paper-500)",
    transition: "background-color 150ms ease",
  };
}

function JourCell({ jour, label }: { jour: number; label: string }) {
  return (
    <div
      style={{
        textAlign: "center",
        minWidth: 64,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--brass-700)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 18,
          fontWeight: 700,
          color: "var(--forest-800)",
          marginTop: 2,
        }}
      >
        N°{String(jour).padStart(3, "0")}
      </div>
    </div>
  );
}

function ChinageRow({
  session,
  last,
  onClick,
}: {
  session: SessionChinage;
  last: boolean;
  onClick: () => void;
}) {
  const total = session.achats.reduce((s, a) => s + a.prixPaye, 0);
  return (
    <li onClick={onClick} style={rowBaseStyle(last)}>
      <JourCell jour={session.jour} label="Chinage" />
      <div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 14,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--forest-800)",
          }}
        >
          {session.brocanteNom}
        </div>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 14,
            color: "var(--ink-500)",
            marginTop: 2,
          }}
        >
          {session.achats.length === 0
            ? "Sortie bredouille."
            : `${session.achats.length} pièce${session.achats.length > 1 ? "s" : ""} ramenée${session.achats.length > 1 ? "s" : ""}.`}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--brass-700)",
          }}
        >
          Dépensé
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 18,
            fontWeight: 700,
            color: "var(--vermillion-600)",
          }}
        >
          −{total} €
        </div>
      </div>
    </li>
  );
}

function VenteRow({
  session,
  last,
  onClick,
}: {
  session: SessionVente;
  last: boolean;
  onClick: () => void;
}) {
  const beneficeBrut = beneficeSession(session);
  const recetteTotale = session.ventes.reduce((s, v) => s + v.prixVente, 0);
  return (
    <li onClick={onClick} style={rowBaseStyle(last)}>
      <JourCell jour={session.jour} label="Vente" />
      <div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 14,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--forest-800)",
          }}
        >
          Stand niveau {session.niveauStand}
        </div>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 14,
            color: "var(--ink-500)",
            marginTop: 2,
          }}
        >
          {session.ventes.length === 0
            ? "Aucune vente."
            : `${session.ventes.length} vente${session.ventes.length > 1 ? "s" : ""} · ${recetteTotale} € de recette · ${session.invendus} invendu${session.invendus > 1 ? "s" : ""}.`}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--brass-700)",
          }}
        >
          Bénéfice
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 18,
            fontWeight: 700,
            color:
              beneficeBrut > 0
                ? "var(--forest-700)"
                : beneficeBrut < 0
                ? "var(--vermillion-600)"
                : "var(--ink-700)",
          }}
        >
          {beneficeBrut >= 0 ? "+" : ""}
          {beneficeBrut} €
        </div>
      </div>
    </li>
  );
}

function beneficeSession(session: SessionVente): number {
  const recette = session.ventes.reduce((s, v) => s + v.prixVente, 0);
  const couts = session.ventes.reduce(
    (s, v) => s + (v.prixAchat ?? 0),
    0,
  );
  return recette - couts - session.loyer;
}

function SessionDetailModal({
  session,
  onClose,
}: {
  session: Session;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,30,22,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          background: "var(--paper-200)",
          backgroundImage: "url(/assets/paper-grain.svg)",
          backgroundSize: "320px 320px",
          border: "1px solid var(--brass-500)",
          boxShadow:
            "inset 0 0 0 4px var(--paper-200), inset 0 0 0 5px var(--brass-500), 0 24px 60px rgba(15,30,22,0.5)",
          padding: "28px 32px",
          maxWidth: 640,
          width: "100%",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <header style={{ textAlign: "center", marginBottom: 14 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 10,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "var(--brass-700)",
              fontWeight: 600,
            }}
          >
            — jour N°{String(session.jour).padStart(3, "0")} —
          </div>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 24,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--forest-800)",
              margin: "6px 0 4px",
              lineHeight: 1.1,
            }}
          >
            {session.type === "chinage" ? session.brocanteNom : `Stand niveau ${session.niveauStand}`}
          </h2>
          <DecoDivider />
        </header>

        {session.type === "chinage" ? (
          <DetailChinage session={session} />
        ) : (
          <DetailVente session={session} />
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 18,
            paddingTop: 14,
            borderTop: "1px solid rgba(138,106,38,0.35)",
          }}
        >
          <Button variant="secondary" size="md" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}

function DetailChinage({ session }: { session: SessionChinage }) {
  const total = session.achats.reduce((s, a) => s + a.prixPaye, 0);

  if (session.achats.length === 0) {
    return (
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: 15,
          color: "var(--ink-500)",
          textAlign: "center",
          padding: "20px 0",
        }}
      >
        Vous êtes rentré les mains vides. Cela arrive aux meilleurs.
      </p>
    );
  }

  return (
    <>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {session.achats.map((a, i) => (
          <li
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              alignItems: "center",
              gap: 14,
              padding: "10px 0",
              borderBottom:
                i < session.achats.length - 1
                  ? "1px dotted var(--paper-500)"
                  : "none",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  fontSize: 13,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--forest-800)",
                }}
              >
                {a.nom}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 4,
                  alignItems: "center",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10.5,
                  color: "var(--ink-500)",
                }}
              >
                <EtatBadge etat={a.etat} />
                <span>{a.categorie}</span>
                <span>· réf. {a.prixReferenceReel} €</span>
              </div>
            </div>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 18,
                color: "var(--vermillion-600)",
              }}
            >
              −{a.prixPaye} €
            </span>
          </li>
        ))}
      </ul>
      <footer
        style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: "1px solid rgba(138,106,38,0.35)",
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--font-display)",
          fontSize: 14,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          fontWeight: 700,
          color: "var(--forest-800)",
        }}
      >
        <span>Total dépensé</span>
        <span style={{ color: "var(--vermillion-600)" }}>−{total} €</span>
      </footer>
    </>
  );
}

function DetailVente({ session }: { session: SessionVente }) {
  const recette = session.ventes.reduce((s, v) => s + v.prixVente, 0);
  const couts = session.ventes.reduce((s, v) => s + (v.prixAchat ?? 0), 0);
  const benefice = beneficeSession(session);

  return (
    <>
      {session.ventes.length === 0 ? (
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 15,
            color: "var(--ink-500)",
            textAlign: "center",
            padding: "20px 0",
          }}
        >
          Aucune vente conclue. Le loyer a quand même été versé.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {session.ventes.map((v, i) => {
            const marge =
              v.prixAchat !== null ? v.prixVente - v.prixAchat : null;
            return (
              <li
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  alignItems: "center",
                  gap: 14,
                  padding: "10px 0",
                  borderBottom:
                    i < session.ventes.length - 1
                      ? "1px dotted var(--paper-500)"
                      : "none",
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 600,
                      fontSize: 13,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--forest-800)",
                    }}
                  >
                    {v.nom}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 4,
                      alignItems: "center",
                      fontFamily: "var(--font-mono)",
                      fontSize: 10.5,
                      color: "var(--ink-500)",
                    }}
                  >
                    <EtatBadge etat={v.etat} />
                    <span>
                      {v.prixAchat !== null
                        ? `acheté ${v.prixAchat} €`
                        : "stock initial"}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: 18,
                      color: "var(--forest-700)",
                    }}
                  >
                    +{v.prixVente} €
                  </div>
                  {marge !== null && (
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        letterSpacing: "0.08em",
                        color:
                          marge > 0
                            ? "var(--forest-700)"
                            : marge < 0
                            ? "var(--vermillion-600)"
                            : "var(--ink-500)",
                      }}
                    >
                      marge {marge >= 0 ? "+" : ""}
                      {marge} €
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <footer
        style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: "1px solid rgba(138,106,38,0.35)",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--ink-700)",
        }}
      >
        <FooterLine label="Recette" value={`+${recette} €`} positive />
        <FooterLine label="Coûts d'achat" value={`−${couts} €`} />
        <FooterLine label="Loyer du stand" value={`−${session.loyer} €`} />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 6,
            paddingTop: 8,
            borderTop: "1px dotted var(--paper-500)",
            fontFamily: "var(--font-display)",
            fontSize: 16,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          <span>Bénéfice net</span>
          <span
            style={{
              color:
                benefice > 0
                  ? "var(--forest-700)"
                  : benefice < 0
                  ? "var(--vermillion-600)"
                  : "var(--ink-700)",
            }}
          >
            {benefice >= 0 ? "+" : ""}
            {benefice} €
          </span>
        </div>
      </footer>
    </>
  );
}

function FooterLine({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "var(--ink-500)" }}>{label}</span>
      <span
        style={{
          color: positive ? "var(--forest-700)" : "var(--vermillion-600)",
          fontWeight: 600,
        }}
      >
        {value}
      </span>
    </div>
  );
}
