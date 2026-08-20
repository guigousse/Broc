// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { ItemImage } from "./ItemImage";

afterEach(cleanup);

// `jx.jeu_magnatimmo_annees_80` figure dans `ITEMS_WITH_IMAGE` (cf.
// `src/lib/itemImages.ts`) : c'est ce qui fait passer le composant sur la
// branche `<Image>` plutôt que sur le fallback icône, seule branche où
// `object-position` s'observe.
const TEMPLATE_AVEC_IMAGE = "jx.jeu_magnatimmo_annees_80";

describe("ItemImage", () => {
  // ── Ancrage vertical de l'image : demande du 2026-08-20, round 2 ─────────
  // La vitrine du Bazar letterboxe (`fit: contain`) un objet large et bas :
  // sans ancrer le bas de l'image, le vide du letterboxing le fait flotter
  // au-dessus de la planche au lieu d'y reposer. jsdom n'a pas de layout,
  // seul le style en ligne peut en témoigner.
  it("par défaut, l'image reste centrée (comportement inchangé pour tous les autres écrans)", () => {
    const { container } = render(
      <ItemImage templateId={TEMPLATE_AVEC_IMAGE} categorie="Jeux & Loisirs" alt="" />,
    );
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.style.objectPosition).toBe("center");
  });

  it("verticalAlign=\"bottom\" : l'image est ancrée sur l'arête basse (object-position)", () => {
    const { container } = render(
      <ItemImage
        templateId={TEMPLATE_AVEC_IMAGE}
        categorie="Jeux & Loisirs"
        alt=""
        verticalAlign="bottom"
      />,
    );
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.style.objectPosition).toBe("center bottom");
  });
});
