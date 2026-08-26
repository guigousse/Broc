// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useMissionCible } from "./useMissionCible";

describe("useMissionCible", () => {
  it("une cible fraîchement armée l'emporte sur une URL périmée (bouton retour)", () => {
    // Scénario du tour de correction : le joueur livre un chapitre depuis
    // le carnet (route -> /bureau), le chapitre suivant s'arme en attente
    // carnet fermé, puis un retour arrière restaure /quetes?mission=<déjà
    // livré>. L'attente fraîche doit primer sur cette URL périmée.
    const { result, rerender } = renderHook(
      ({ carnetOuvert, missionUrl }) => useMissionCible(carnetOuvert, missionUrl),
      { initialProps: { carnetOuvert: false, missionUrl: "chapitre_livre" as string | null } },
    );
    act(() => result.current.armerAttente("chapitre_suivant"));
    rerender({ carnetOuvert: true, missionUrl: "chapitre_livre" });
    expect(result.current.missionCibleId).toBe("chapitre_suivant");
  });

  it("une pastille tapée explicitement l'emporte sur une attente périmée", () => {
    // Le site d'appel (LivrablesBadges.onTap) purge l'attente avant de
    // pousser sa propre URL : une attente laissée par un autre chemin ne
    // doit pas masquer la mission que le joueur vient de taper.
    const { result, rerender } = renderHook(
      ({ carnetOuvert, missionUrl }) => useMissionCible(carnetOuvert, missionUrl),
      { initialProps: { carnetOuvert: false, missionUrl: null as string | null } },
    );
    act(() => result.current.armerAttente("chapitre_en_reserve"));
    act(() => result.current.armerAttente(null));
    rerender({ carnetOuvert: true, missionUrl: "mission_tapee" });
    expect(result.current.missionCibleId).toBe("mission_tapee");
  });

  it("l'attente est purgée dès l'ouverture : elle ne survit pas à une ouverture suivante", () => {
    const { result, rerender } = renderHook(
      ({ carnetOuvert, missionUrl }) => useMissionCible(carnetOuvert, missionUrl),
      { initialProps: { carnetOuvert: false, missionUrl: null as string | null } },
    );
    act(() => result.current.armerAttente("chapitre_suivant"));
    rerender({ carnetOuvert: true, missionUrl: null });
    expect(result.current.missionCibleId).toBe("chapitre_suivant");
    rerender({ carnetOuvert: false, missionUrl: null });
    // Ouverture suivante, générique : ni URL ni ré-armement — l'attente
    // consommée au tour précédent ne doit plus ressurgir.
    rerender({ carnetOuvert: true, missionUrl: null });
    expect(result.current.missionCibleId).toBeNull();
  });

  it("un rechargement direct sur /quetes?mission=x déplie encore la bonne quête", () => {
    const { result } = renderHook(
      ({ carnetOuvert, missionUrl }) => useMissionCible(carnetOuvert, missionUrl),
      { initialProps: { carnetOuvert: true, missionUrl: "x" } },
    );
    expect(result.current.missionCibleId).toBe("x");
  });

  it("carnet fermé : pas de cible affichée même si une attente est armée", () => {
    const { result } = renderHook(
      ({ carnetOuvert, missionUrl }) => useMissionCible(carnetOuvert, missionUrl),
      { initialProps: { carnetOuvert: false, missionUrl: null as string | null } },
    );
    act(() => result.current.armerAttente("chapitre_suivant"));
    expect(result.current.missionCibleId).toBeNull();
  });

  it("armerAttente pendant que le carnet est déjà OUVERT est ignoré : l'invariant devient structurel", () => {
    // Troisième récidive potentielle du défaut « valeur périmée qui survit » :
    // les deux appelants réels (LivrablesBadges.onTap, le dialogue du
    // grand-père) sont structurellement carnet fermé quand ils arment une
    // attente, mais rien ne l'empêchait avant ce correctif. Un appel pendant
    // que le carnet est ouvert doit être un no-op, pas juste un cas qui
    // n'arrive jamais en pratique.
    const { result, rerender } = renderHook(
      ({ carnetOuvert, missionUrl }) => useMissionCible(carnetOuvert, missionUrl),
      { initialProps: { carnetOuvert: true, missionUrl: null as string | null } },
    );
    act(() => result.current.armerAttente("chapitre_ignore"));
    rerender({ carnetOuvert: false, missionUrl: null });
    rerender({ carnetOuvert: true, missionUrl: null });
    expect(result.current.missionCibleId).toBeNull();
  });

  it("un router.replace pendant que le carnet reste ouvert recale la cible sans repasser par une fermeture", () => {
    // Mini-tuto de fin de tutoriel : le dialogue du chapitre joue par-dessus
    // le carnet resté ouvert, et router.replace pose la nouvelle mission
    // dans l'URL sans jamais fermer /quetes.
    const { result, rerender } = renderHook(
      ({ carnetOuvert, missionUrl }) => useMissionCible(carnetOuvert, missionUrl),
      { initialProps: { carnetOuvert: true, missionUrl: "ancienne" as string | null } },
    );
    expect(result.current.missionCibleId).toBe("ancienne");
    rerender({ carnetOuvert: true, missionUrl: "chapitre_neuf" });
    expect(result.current.missionCibleId).toBe("chapitre_neuf");
  });
});
