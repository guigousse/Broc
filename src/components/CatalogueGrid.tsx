import type { CatalogueEntree } from "@/types/game";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { RareteBadge } from "@/components/ui/RareteBadge";

export function CatalogueGrid({ entrees }: { entrees: CatalogueEntree[] }) {
  if (entrees.length === 0) {
    return (
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          color: "var(--ink-500)",
          textAlign: "center",
          padding: "24px 0",
          margin: 0,
        }}
      >
        Aucune pièce répertoriée dans cette catégorie.
      </p>
    );
  }
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: 12,
      }}
    >
      {entrees.map((e) => (
        <EntreeCard key={e.templateId} entree={e} />
      ))}
    </div>
  );
}

function EntreeCard({ entree }: { entree: CatalogueEntree }) {
  const decouvert = entree.vu;
  const possede = entree.possede > 0;
  const filtre = !decouvert
    ? "brightness(0) opacity(0.45)"
    : !possede
      ? "grayscale(1) opacity(0.6)"
      : "none";

  return (
    <article
      style={{
        position: "relative",
        background: "var(--paper-300)",
        border: `1px solid ${possede ? "var(--brass-500)" : "var(--paper-500)"}`,
        padding: 12,
        opacity: !decouvert ? 0.75 : 1,
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          inset: 3,
          border: "1px solid rgba(138,106,38,0.3)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          aspectRatio: "4 / 3",
          background:
            "linear-gradient(135deg, var(--paper-500) 0%, var(--brass-700) 100%)",
          border: "1px solid var(--brass-700)",
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--brass-100)",
          filter: filtre,
        }}
      >
        <CategorieIcon categorie={entree.categorie} size={42} strokeWidth={1.25} />
      </div>

      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: possede ? "var(--forest-800)" : "var(--ink-500)",
          lineHeight: 1.2,
          minHeight: 30,
        }}
      >
        {decouvert ? entree.nom : "???"}
      </div>

      <div
        style={{
          marginTop: 8,
          paddingTop: 7,
          borderTop: "1px dotted var(--paper-500)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {decouvert ? <RareteBadge rarete={entree.rarete} /> : <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.16em", color: "var(--ink-300)" }}>· ? ·</span>}
        {possede && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.16em",
              color: "var(--brass-700)",
            }}
            title={`Possédé ${entree.possede} fois`}
          >
            ×{entree.possede}
          </span>
        )}
      </div>
    </article>
  );
}
