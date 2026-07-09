"use client";

import type { CategorieObjet, ObjetEnVitrine } from "@/types/game";
import { getRarityColors } from "@/lib/rarityColors";
import { getTemplate } from "@/data/objetTemplates";
import { etoileCount } from "@/lib/etat";
import { ItemSticker } from "@/components/ui/ItemSticker";
import { StarRow } from "@/components/ui/StarRow";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { useLangue } from "@/lib/i18n/LangueContext";
import { nomObjet } from "@/lib/i18n/contenu";
import { PrixSlider } from "./PrixSlider";

interface Props {
  coffre: ObjetEnVitrine[];
  onAjusterPrix: (objetId: string, prix: number) => void;
  onRetour: () => void;
  /** Action de validation (continuer le flow). Anciennement `onOuvrir`. */
  onValider: () => void;
  /** Libellé du bouton de validation. Ex : "Ouvrir l'étal · 5 €" ou "Choisir la brocante →". */
  validerLabel: string;
  /** Override de l'état actif du bouton de validation. Par défaut : coffre non vide. */
  validerActif?: boolean;
  /** Catégories pour lesquelles Connaisseur 2 est débloqué (valeur de référence visible). */
  categoriesConnues: ReadonlySet<CategorieObjet>;
}

export function CoffrePricing({
  coffre,
  onAjusterPrix,
  onRetour,
  onValider,
  validerLabel,
  validerActif,
  categoriesConnues,
}: Props) {
  const { d, tr, locale } = useLangue();
  const peut = validerActif ?? coffre.length > 0;

  return (
    <>
      <section
        style={{
          margin: "0 12px 12px",
          border: "1px solid var(--brass-500)",
          background: "var(--paper-100)",
          padding: "10px 12px",
        }}
      >
        {coffre.map((ov, i) => {
          const isUnique = !!getTemplate(ov.objet.templateId)?.unique;
          const c = getRarityColors(ov.objet.rarete, isUnique);
          const isLast = i === coffre.length - 1;
          const ref = Math.max(1, Math.round(ov.objet.prixReferenceReel));
          const marcheConnu = categoriesConnues.has(ov.objet.categorie);

          return (
            <div
              key={ov.objet.id}
              style={{
                padding: "14px 0",
                borderBottom: isLast ? "none" : "1px dotted var(--paper-500)",
              }}
            >
              {/* Ligne 1 : sticker · (nom + état/thème) */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "56px 1fr",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <div style={{ width: 56, height: 56, display: "grid", placeItems: "center" }}>
                  <ItemSticker
                    templateId={ov.objet.templateId}
                    categorie={ov.objet.categorie}
                    fill
                    tilt={false}
                    variant="normal"
                    thumb
                    eager
                  />
                </div>

                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 12.5,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--forest-800)",
                      fontWeight: 700,
                      lineHeight: 1.15,
                    }}
                  >
                    {nomObjet(ov.objet, locale)}
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}
                    aria-label={tr(d.inventaire.etatCategorieAria, {
                      etat: ov.objet.etat,
                      categorie: ov.objet.categorie,
                    })}
                  >
                    <StarRow
                      filled={etoileCount(ov.objet.etat)}
                      color={c.outer}
                      display="flex"
                      aria-label={tr(d.chine.etatAriaLabel, { etat: ov.objet.etat })}
                    />
                    <span
                      style={{ display: "inline-flex", alignItems: "center" }}
                      aria-label={tr(d.inventaire.categorieAria, {
                        categorie: ov.objet.categorie,
                      })}
                    >
                      <CategorieIcon
                        categorie={ov.objet.categorie}
                        size={14}
                        strokeWidth={1.5}
                        color="var(--brass-700)"
                      />
                    </span>
                  </div>
                </div>
              </div>

              {/* Ligne 2 : curseur de prix (poignée = prix, façon négociation) */}
              <div style={{ marginTop: 10 }}>
                <PrixSlider
                  value={ov.prixVente}
                  marche={ref}
                  achat={ov.objet.prixAchat}
                  marcheConnu={marcheConnu}
                  onChange={(prix) => onAjusterPrix(ov.objet.id, prix)}
                />
              </div>
            </div>
          );
        })}
      </section>
      <div
        style={{
          position: "sticky",
          bottom: 0,
          padding: "10px 14px calc(10px + var(--safe-bottom))",
          background: "var(--paper-100)",
          borderTop: "1px solid var(--brass-500)",
          display: "flex",
          gap: 10,
        }}
      >
        <button
          type="button"
          onClick={onRetour}
          style={{
            flex: 1,
            padding: 10,
            border: "1px solid var(--brass-500)",
            background: "var(--paper-100)",
            fontFamily: "var(--font-display)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          {d.vente.retourCoffreCourt}
        </button>
        <button
          type="button"
          disabled={!peut}
          onClick={onValider}
          style={{
            flex: 2,
            padding: 10,
            border: "1px solid var(--brass-500)",
            background: peut ? "var(--forest-800)" : "var(--paper-300)",
            color: peut ? "var(--brass-300)" : "var(--ink-500)",
            fontFamily: "var(--font-display)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          {validerLabel}
        </button>
      </div>
    </>
  );
}
