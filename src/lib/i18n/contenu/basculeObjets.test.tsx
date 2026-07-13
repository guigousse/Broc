// @vitest-environment jsdom
import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LangueProvider } from "@/lib/i18n/LangueContext";
import { ALL_TEMPLATES } from "@/data/objetTemplates";
import { OBJETS_EN } from "@/lib/i18n/contenu/en/objets";
import { ChineSlideVue, type ChineSlide } from "@/components/mobile/chine/ChineSlide";
import { createMockObjet } from "@/lib/__test-fixtures__/gameState";
import type { NegoPersona, ObjetEnVente } from "@/types/game";

afterEach(cleanup);

// Composant témoin de la bascule : le nom affiché doit venir de l'overlay,
// pas du snapshot persisté (règle d'or : le champ `nom` en save n'est
// qu'un repli, jamais affiché tel quel hors locale FR/legacy).
const template = ALL_TEMPLATES[0];

const persona: NegoPersona = {
  archetype: "grincheux",
  margePct: 0.1,
  elanPct: 0.25,
  patience: 3,
  tolerancePct: 0.3,
  sangFroid: 0.25,
};

function makeItem(): ObjetEnVente {
  return {
    id: "item-1",
    objet: createMockObjet({
      templateId: template.templateId,
      nom: "SNAPSHOT FR PÉRIMÉ", // ne doit JAMAIS s'afficher hors FR
    }),
    prixVendeur: 50,
    prixAffiche: true,
    prixMinAccept: 30,
    negociationsTentees: 0,
    statut: "disponible",
    persona,
    negociation: null,
  };
}

const slide: ChineSlide = {
  kind: "item",
  item: makeItem(),
  estRareOuPlus: false,
  coteConnue: false,
  dejaPossede: false,
};

describe("bascule des noms d'objets", () => {
  test("locale en : nom overlay affiché, snapshot ignoré", async () => {
    localStorage.setItem("projet-broc:langue:v1", "en");
    render(
      <LangueProvider>
        <ChineSlideVue slide={slide} />
      </LangueProvider>,
    );

    expect(await screen.findByText(OBJETS_EN[template.templateId])).toBeTruthy();
    expect(screen.queryByText("SNAPSHOT FR PÉRIMÉ")).toBeNull();
    localStorage.clear();
  });
});
