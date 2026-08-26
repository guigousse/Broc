"use client";

import { useEffect, useRef, useState } from "react";
import { QG_LAYOUT, type QgObjetKey } from "../layout";
import { CHAT_BALADEUR_ORDER, type ChatBaladeurId } from "@/lib/chatBaladeur";
import { type BazarObjetKey } from "@/components/bazar/bazarLayout";
import {
  useQgObjet,
  useChatBaladeurCoord,
  useQgEditContext,
  coordBase,
  familleEditable,
  type EditableKey,
  type FamilleEditable,
} from "./QgEditContext";

const QG_KEYS = Object.keys(QG_LAYOUT.objets) as QgObjetKey[];
const CHAT_KEYS = [...CHAT_BALADEUR_ORDER] as ChatBaladeurId[];
/** Familles affichées quand aucune liste de clés n'est passée : la scène du QG. */
const CLES_QG_PAR_DEFAUT: EditableKey[] = [...QG_KEYS, ...CHAT_KEYS];

const TITRE_FAMILLE: Record<FamilleEditable, string> = {
  qg: "// QG objets",
  chat: "// Chat baladeur",
  bazar: "// Bazar",
};
const ORDRE_FAMILLES: FamilleEditable[] = ["qg", "chat", "bazar"];

// Position au-dessous du header mobile (var injectée par MobileLayout).
const ANCHOR_STYLE = {
  position: "fixed" as const,
  top: "calc(var(--safe-top) + var(--mobile-header-h) + 8px)",
  right: 12,
  zIndex: 100,
};

/**
 * Dispatch par COMPOSANT, jamais par hook — même mécanique que `QgEditOverlay`.
 * Chaque wrapper appelle SON hook inconditionnellement : un `if` autour d'un
 * appel de hook a déjà valu un crash React #310 dans ce fichier voisin.
 */
function LigneObjet({ editKey }: { editKey: EditableKey }) {
  const famille = familleEditable(editKey);
  if (famille === "chat") return <ChatRow chatKey={editKey as ChatBaladeurId} />;
  if (famille === "bazar") return <BazarRow bazarKey={editKey as BazarObjetKey} />;
  return <QgRow qgKey={editKey as QgObjetKey} />;
}

function QgRow({ qgKey }: { qgKey: QgObjetKey }) {
  const { left, bottom, width } = useQgObjet(qgKey);
  return <CoordRow name={qgKey} left={left} bottom={bottom} width={width} />;
}

function ChatRow({ chatKey }: { chatKey: ChatBaladeurId }) {
  const { left, bottom, width } = useChatBaladeurCoord(chatKey);
  return <CoordRow name={chatKey} left={left} bottom={bottom} width={width} />;
}

function BazarRow({ bazarKey }: { bazarKey: BazarObjetKey }) {
  const { left, bottom, width } = useQgObjet(bazarKey);
  return <CoordRow name={bazarKey} left={left} bottom={bottom} width={width} />;
}

function CoordRow({
  name,
  left,
  bottom,
  width,
}: {
  name: string;
  left: number;
  bottom: number;
  width: number;
}) {
  return (
    <div style={{ fontFamily: "monospace", fontSize: 11, lineHeight: 1.6, color: "#e8d5a3" }}>
      <span style={{ color: "#a8c4e0" }}>{name}</span>
      {": { left: "}
      <span style={{ color: "#b8e0a8" }}>{left.toFixed(1)}</span>
      {", bottom: "}
      <span style={{ color: "#b8e0a8" }}>{bottom.toFixed(1)}</span>
      {", width: "}
      <span style={{ color: "#b8e0a8" }}>{width.toFixed(1)}</span>
      {" },"}
    </div>
  );
}

interface QgEditPanelProps {
  /**
   * Clés à lister sur CETTE scène — même contrat que `QgEditOverlay.cles`.
   * Non fourni : les clés du QG (objets + chat baladeur).
   */
  cles?: EditableKey[];
  /** Étiquette du panneau. Défaut : « QG edit ». */
  titre?: string;
}

/** Ce qu'a donné le dernier clic sur « Copier ». */
type EtatCopie = null | "copie" | "manuel";

export function QgEditPanel({ cles, titre = "QG edit" }: QgEditPanelProps = {}) {
  const ctx = useQgEditContext();
  const [collapsed, setCollapsed] = useState(false);
  const [etatCopie, setEtatCopie] = useState<EtatCopie>(null);
  /** L'extrait à recopier à la main, quand le presse-papiers fait défaut. */
  const [extraitManuel, setExtraitManuel] = useState<string | null>(null);
  const zoneRef = useRef<HTMLTextAreaElement | null>(null);
  const active = ctx?.active ?? false;

  // La zone de repli n'a d'intérêt que si son contenu est DÉJÀ sélectionné :
  // sur un téléphone, sélectionner soi-même quinze lignes de monospace à la
  // loupe est exactement ce qu'on cherchait à éviter.
  useEffect(() => {
    if (extraitManuel === null) return;
    const zone = zoneRef.current;
    if (!zone) return;
    zone.focus();
    zone.select();
    // iOS ignore `select()` sur un textarea non focalisé ET refuse la
    // sélection programmée si le champ est en lecture seule : d'où le champ
    // éditable, plus `setSelectionRange` qui, lui, est honoré.
    zone.setSelectionRange(0, extraitManuel.length);
  }, [extraitManuel]);

  const clesAffichees = cles ?? CLES_QG_PAR_DEFAUT;
  const groupes = ORDRE_FAMILLES.map((famille) => ({
    famille,
    cles: clesAffichees.filter((k) => familleEditable(k) === famille),
  })).filter((g) => g.cles.length > 0);

  function effective(key: EditableKey) {
    // `coordBase` connaît les trois familles (QG, chat, Bazar) : c'est la même
    // fonction que celle dont dérive `useQgObjet`, donc plus aucune chance de
    // diverger.
    const base = coordBase(key);
    const o = ctx?.overrides[key];
    return {
      left: o?.left ?? base.left,
      bottom: o?.bottom ?? base.bottom,
      width: o?.width ?? base.width,
    };
  }

  function ligneSnippet(k: EditableKey): string {
    const e = effective(k);
    // Le chat baladeur est indexé par des identifiants non conformes à la
    // syntaxe des clés nues (`"chat-1"`), d'où les guillemets pour cette
    // famille seulement.
    const nom = familleEditable(k) === "chat" ? `  "${k}"` : `    ${k}`;
    return `${nom}: { left: ${e.left.toFixed(1)}, bottom: ${e.bottom.toFixed(1)}, width: ${e.width.toFixed(1)} },`;
  }

  /**
   * Copier l'extrait — sans jamais lever.
   *
   * L'auteur cale les scènes depuis SON TÉLÉPHONE, sur le serveur de dev servi
   * en HTTP simple sur le réseau local. Or Safari n'expose PAS `navigator
   * .clipboard` hors contexte sécurisé : l'objet est `undefined`, et
   * `navigator.clipboard.writeText(...)` levait `undefined is not an object`
   * AVANT même d'atteindre le `.catch()` — le clic ne faisait rien, aucune
   * trace, et les coordonnées qu'il venait de poser étaient irrécupérables.
   *
   * On tente donc l'API quand elle existe, et on retombe sinon sur ce qui
   * marche vraiment en contexte non sécurisé : un `<textarea>` dont le
   * contenu est déjà sélectionné, prêt pour un « Copier » à la main. Le
   * panneau dit lequel des deux chemins a été pris.
   */
  function handleCopy() {
    const snippet = groupes
      .map((g) => TITRE_FAMILLE[g.famille] + "\n" + g.cles.map(ligneSnippet).join("\n"))
      .join("\n\n");
    try {
      const presse =
        typeof navigator === "undefined" ? undefined : navigator.clipboard;
      if (typeof presse?.writeText === "function") {
        presse.writeText(snippet).then(
          () => {
            setExtraitManuel(null);
            setEtatCopie("copie");
          },
          // Promesse rejetée : le presse-papiers EXISTE mais refuse (permission
          // refusée, document non focalisé…). Même repli que s'il manquait.
          () => replierSurZone(snippet),
        );
        return;
      }
    } catch {
      // Un accès à `navigator.clipboard` qui lève : on replie, comme le reste.
    }
    replierSurZone(snippet);
  }

  function replierSurZone(snippet: string) {
    setExtraitManuel(snippet);
    setEtatCopie("manuel");
  }

  function handleReset() {
    ctx?.resetAll();
  }

  if (collapsed) {
    return (
      <div
        style={{
          ...ANCHOR_STYLE,
          background: "rgba(20, 16, 10, 0.9)",
          border: "1px solid var(--brass-500)",
          borderRadius: 6,
          padding: "4px 10px",
          fontSize: 11,
          fontFamily: "monospace",
          color: "var(--brass-500)",
          cursor: "pointer",
          userSelect: "none",
          display: "flex",
          gap: 6,
          alignItems: "center",
        }}
        onClick={() => setCollapsed(false)}
      >
        <span>{titre}</span>
        <span
          style={{
            fontSize: 9,
            padding: "1px 5px",
            borderRadius: 8,
            background: active ? "var(--brass-500)" : "rgba(168,120,60,0.25)",
            color: active ? "#1a1208" : "var(--brass-500)",
            fontWeight: "bold",
          }}
        >
          {active ? "ON" : "OFF"}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        ...ANCHOR_STYLE,
        background: "rgba(20, 16, 10, 0.92)",
        border: "1px solid var(--brass-500)",
        borderRadius: 8,
        padding: "10px 12px",
        minWidth: 280,
        maxWidth: "calc(100vw - 24px)",
        maxHeight: "70vh",
        overflowY: "auto",
        boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontFamily: "monospace",
            color: "var(--brass-500)",
            fontWeight: "bold",
            letterSpacing: "0.08em",
          }}
        >
          {titre} mode
        </span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => ctx?.setActive(!active)}
            style={{
              background: active ? "var(--brass-500)" : "transparent",
              border: "1px solid var(--brass-500)",
              borderRadius: 12,
              padding: "2px 10px",
              fontSize: 10,
              fontFamily: "monospace",
              fontWeight: "bold",
              color: active ? "#1a1208" : "var(--brass-500)",
              cursor: "pointer",
              letterSpacing: "0.05em",
            }}
            aria-pressed={active}
            aria-label={active ? "Désactiver l'outil" : "Activer l'outil"}
          >
            {active ? "ACTIF" : "INACTIF"}
          </button>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            style={{
              background: "none",
              border: "none",
              color: "var(--brass-500)",
              cursor: "pointer",
              fontSize: 13,
              padding: "0 2px",
              lineHeight: 1,
            }}
            aria-label="Replier"
          >
            ✕
          </button>
        </div>
      </div>

      <div
        style={{
          background: "rgba(0,0,0,0.4)",
          borderRadius: 4,
          padding: "6px 8px",
          marginBottom: 8,
          opacity: active ? 1 : 0.45,
        }}
      >
        {groupes.map((g, i) => (
          <div key={g.famille}>
            <div
              style={{
                color: "#8aa",
                fontSize: 10,
                margin: i === 0 ? "0 0 4px" : "6px 0 4px",
              }}
            >
              {TITRE_FAMILLE[g.famille]}
            </div>
            {g.cles.map((k) => (
              <LigneObjet key={k} editKey={k} />
            ))}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            flex: 1,
            background: "var(--brass-500)",
            border: "none",
            borderRadius: 4,
            padding: "5px 8px",
            fontSize: 11,
            fontFamily: "monospace",
            color: "#1a1208",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Copier
        </button>
        <button
          type="button"
          onClick={handleReset}
          style={{
            flex: 1,
            background: "transparent",
            border: "1px solid rgba(168,120,60,0.5)",
            borderRadius: 4,
            padding: "5px 8px",
            fontSize: 11,
            fontFamily: "monospace",
            color: "var(--brass-500)",
            cursor: "pointer",
          }}
        >
          Reset
        </button>
      </div>

      {etatCopie !== null && (
        <div
          role="status"
          style={{
            marginTop: 6,
            fontSize: 10,
            fontFamily: "monospace",
            lineHeight: 1.4,
            color: etatCopie === "copie" ? "#b8e0a8" : "#e8d5a3",
          }}
        >
          {etatCopie === "copie"
            ? "Copié dans le presse-papiers."
            : "Presse-papiers indisponible (HTTP simple) — texte sélectionné, copiez-le à la main."}
        </div>
      )}

      {extraitManuel !== null && (
        <textarea
          ref={zoneRef}
          value={extraitManuel}
          // Éditable, pas `readOnly` : iOS refuse de sélectionner un champ en
          // lecture seule. Ce qu'on y taperait n'a aucune conséquence — la
          // zone est jetée au clic suivant sur « Copier ».
          onChange={(e) => setExtraitManuel(e.target.value)}
          spellCheck={false}
          rows={Math.min(12, extraitManuel.split("\n").length)}
          aria-label="Extrait à copier à la main"
          style={{
            width: "100%",
            marginTop: 6,
            background: "rgba(0,0,0,0.5)",
            border: "1px solid var(--brass-500)",
            borderRadius: 4,
            padding: "6px 8px",
            fontSize: 10,
            fontFamily: "monospace",
            lineHeight: 1.4,
            color: "#e8d5a3",
            resize: "vertical",
            whiteSpace: "pre",
          }}
        />
      )}
    </div>
  );
}
