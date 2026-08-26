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
  // `fit: contain` letterboxe un objet large et bas (une ménagère, une pile de
  // vinyles) : sans ancrer le bas de l'image, le vide du letterboxing le fait
  // flotter au-dessus de la planche au lieu d'y reposer. jsdom n'a pas de
  // layout, seul le style en ligne peut en témoigner.
  //
  // ⚠ CETTE PROP N'A PLUS AUCUN APPELANT APPLICATIF depuis que l'étal du Bazar
  // — son seul client — est passé à `ItemSticker` (qui a reçu le même réglage,
  // sous le même nom). Elle est CONSERVÉE DÉLIBÉRÉMENT : la question « objet
  // posé sur une surface » se reposera au premier écran qui montrera un objet
  // sur un meuble, et la réponse a coûté une demi-journée de recette. Ce n'est
  // pas du code mort à supprimer au prochain ménage — c'est une réponse en
  // attente de sa prochaine question.
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
