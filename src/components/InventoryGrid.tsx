import type { CategorieObjet, Objet } from "@/types/game";
import { EtatBadge } from "@/components/ui/EtatBadge";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { CategorieAccordion } from "@/components/ui/CategorieAccordion";
import { RareteBadge } from "@/components/ui/RareteBadge";
import { CATEGORIES } from "@/data/categories";

interface InventoryGridProps {
  objets: Objet[];
  /** Catégories pour lesquelles la valeur de référence est lisible (skill Marchand averti). */
  categoriesConnues: ReadonlySet<CategorieObjet>;
}

export function InventoryGrid({ objets, categoriesConnues }: InventoryGridProps) {
  if (objets.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 18,
            color: "var(--ink-500)",
            marginBottom: 12,
          }}
        >
          La vitrine est vide.
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--brass-700)",
          }}
        >
          Partez chiner pour la garnir.
        </div>
      </div>
    );
  }

  const parCategorie = new Map<CategorieObjet, Objet[]>();
  for (const cat of CATEGORIES) parCategorie.set(cat, []);
  for (const o of objets) parCategorie.get(o.categorie)?.push(o);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from(parCategorie.entries())
        .filter(([, list]) => list.length > 0)
        .map(([cat, list]) => (
          <CategorieAccordion key={cat} categorie={cat} compte={list.length}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 12,
              }}
            >
              {list.map((o) => (
                <ObjetCard
                  key={o.id}
                  objet={o}
                  montrerPrixRef={categoriesConnues.has(o.categorie)}
                />
              ))}
            </div>
          </CategorieAccordion>
        ))}
    </div>
  );
}

function ObjetCard({
  objet,
  montrerPrixRef,
}: {
  objet: Objet;
  montrerPrixRef: boolean;
}) {
  const ref = `N°${objet.id.slice(0, 6).toUpperCase()}`;
  const enChantier = objet.enRestauration !== undefined;
  return (
    <article
      style={{
        position: "relative",
        background: "var(--paper-300)",
        border: `1px solid ${enChantier ? "var(--brass-700)" : "var(--brass-500)"}`,
        padding: 12,
        boxShadow:
          "0 2px 0 var(--paper-400), 0 4px 10px rgba(40,25,5,0.08)",
        opacity: enChantier ? 0.75 : 1,
      }}
    >
      {objet.rarete !== "commun" && (
        <div
          style={{
            position: "absolute",
            top: 6,
            left: 6,
            zIndex: 1,
          }}
        >
          <RareteBadge rarete={objet.rarete} />
        </div>
      )}
      {enChantier && (
        <div
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            zIndex: 1,
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--paper-100)",
            background: "var(--forest-800)",
            border: "1px solid var(--brass-500)",
            padding: "2px 6px",
          }}
          title={`Finit jour ${objet.enRestauration!.jourFin}`}
        >
          ◆ chantier
        </div>
      )}
      <span
        aria-hidden
        style={{
          position: "absolute",
          inset: 3,
          border: "1px solid rgba(138,106,38,0.4)",
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
        }}
      >
        <CategorieIcon categorie={objet.categorie} size={42} strokeWidth={1.25} />
      </div>

      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9.5,
          color: "var(--brass-700)",
          letterSpacing: "0.08em",
        }}
      >
        {ref}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: 13,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--forest-800)",
          margin: "4px 0 2px",
          lineHeight: 1.2,
        }}
      >
        {objet.nom}
      </div>

      <div
        style={{
          marginTop: 8,
          paddingTop: 7,
          borderTop: "1px dotted var(--paper-500)",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.08em",
            color: "var(--ink-500)",
          }}
        >
          <span style={{ color: "var(--brass-700)" }}>ACHAT</span>
          <span style={{ color: "var(--forest-800)" }}>
            {objet.prixAchat !== undefined ? `${objet.prixAchat} €` : "—"}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <EtatBadge etat={objet.etat} />
          {montrerPrixRef ? (
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 18,
                color: "var(--forest-800)",
              }}
              title="Valeur de référence du marché"
            >
              {objet.prixReferenceReel}
              <span style={{ fontSize: 11, color: "var(--brass-700)" }}>€</span>
            </span>
          ) : (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--ink-300)",
                fontStyle: "italic",
              }}
              title="Marchand averti requis pour cette catégorie"
            >
              valeur ?
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
