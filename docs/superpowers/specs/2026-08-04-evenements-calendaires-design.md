# Événements calendaires — Grande Braderie & anniversaire annuel

**Date** : 2026-08-04
**Statut** : validé par Guillaume

## Contexte et objectif

Le jeu n'a pas de système d'événements calendaires : les seuls rendez-vous
sont la célébrité hebdomadaire, la météo et l'anniversaire one-shot du
11 juin (jour 6 de jeu). Objectif : poser un petit module d'événements
générique et livrer deux événements :

1. **La Grande Braderie** (inspirée de la braderie de Lille) — chaque
   **premier week-end de septembre du calendrier de jeu** (2 jours de jeu :
   premier samedi de septembre + dimanche suivant), sous la forme d'une
   brocante événementielle temporaire. Le joueur la vit quand sa partie
   atteint ces jours-là, quelle que soit la date réelle.
2. **L'anniversaire annuel** — l'anniversaire du 11 juin devient récurrent
   **chaque année du calendrier de jeu**, avec un vinyle en cadeau.

## Décisions structurantes

- **Une seule horloge : le calendrier de jeu** (`src/lib/calendrier.ts`,
  temps linéaire démarrant au vendredi 6 juin, année interne jamais
  affichée). Aucun événement n'est calé sur la date réelle de l'appareil.
- **Pas de notification locale** pour la braderie : un événement en temps de
  jeu ne peut pas être planifié en temps réel (les jours n'avancent qu'en
  jouant). L'annonce passe par le calendrier, la gazette et la carte.
- **Aucun bump de `SAVE_VERSION`** : tout le suivi passe par le tableau
  existant `declencheursDeclenches`.

## 1. Module d'événements

Nouveaux fichiers `src/data/evenements.ts` + `src/lib/evenements.ts`, tout
en jours de jeu (fonctions pures sur `jour: number` via `dateForJour`) :

- `estJourBraderie(jour)` : vrai si `jour` est le premier samedi de
  septembre ou le dimanche qui le suit, pour n'importe quelle année de jeu.
- `prochaineBraderie(jour)` : premier jour (samedi) de la prochaine — ou
  actuelle — braderie, pour l'encart gazette et le calendrier.
- `estAnniversaire(jour)` / `anneeAnniversaire(jour)` : chaque 11 juin de
  chaque année (comparaison mois/jour UTC — gère les années bissextiles).

Récurrence annuelle automatique, aucune date en dur à maintenir.

## 2. La Grande Braderie (brocante événementielle)

Brocante spéciale `grande-braderie`, définie **à part** du tableau
`BROCANTES` permanent, visible dans les listes chine et vente uniquement
les jours de braderie (`estJourBraderie(jourActuel)`).

- **Étal géant, toutes raretés** : pool tiré dans tout le catalogue, tiers
  supérieurs inclus (la progression du joueur n'est pas respectée), taille
  d'étal nettement au-dessus d'une brocante 4★, chances de raretés dopées.
- **Prix cassés** : rabais braderie sur les prix affichés par les vendeurs
  (~-30 %, valeur initiale à ajuster aux tests d'équilibrage).
- **Affluence à la vente** : côté vitrine, clients plus fréquents et bourses
  gonflées — réutilisation des mécanismes du boost célébrité
  (`src/lib/chine.ts` l.200-204, vitrine).
- **Accès** : tutoriel terminé ; frais d'entrée modestes (10 F) ; coût
  d'énergie normal.
- **Visuel** : illustration dédiée avec banderole « Grande Braderie »
  (pipeline Gemini existant, câblage `src/lib/brocanteImages.ts`).
- **Exclusion vinyles cadeau** : les vinyles réservés aux anniversaires
  (voir §4) sont exclus du pool de la braderie comme des autres brocantes.

## 3. Annonces

- **Carte / listes** : l'entrée apparaît dans les listes chine et vente les
  jours de braderie, avec un badge « Événement ».
- **Calendrier** : les deux jours de braderie sont marqués dans la grille
  mensuelle (`CalendrierSheet.tsx`), sur le modèle du cercle célébrité.
- **Gazette** : encart (sur le modèle de l'annonce célébrité,
  `GazetteSheet.tsx`) visible quand la braderie est en cours **ou à moins de
  7 jours de jeu** — « La Grande Braderie ouvre ce week-end ! ». Calculé à
  l'affichage depuis `jourActuel`, pas stocké dans l'édition.
- **Pas de notification locale** (cf. décisions structurantes).
- **i18n** : tous les textes en 4 langues (FR/EN/ES/EL). Règle d'or
  respectée : jamais de chaîne localisée en save.

## 4. Anniversaire annuel & vinyles cadeau

Le paquet de Maman revient **chaque 11 juin de jeu** :

| Année | Cadeau | État | Exclusif ? |
|---|---|---|---|
| 1 | `mus.33tours_jazz_1` (comportement actuel, mini-tuto vinyle inclus) | Très bon (inchangé, lié au mini-tuto restauration) | Oui |
| 2 | `mus.vinyle_whale_song_son_terrestre_n1` | Pristin état | Oui |
| 3 | `mus.vinyle_free_robot_des_punkbot` | Pristin état | Oui |
| 4+ | Un vinyle du catalogue (24) que le joueur ne possède pas au moment du tirage (absent de la collection ET du stockage — un vinyle trouvé puis vendu peut donc être offert) | Pristin état | Non |
| Repli | Si les 24 vinyles sont tous possédés : un vinyle **aléatoire** du catalogue, en Pristin état (doublon assumé, revendable). Jamais de repli énergie — l'IAP énergie infinie le rendrait vide. | Pristin état | Non |

- **Exclusivité (années 1-3)** : ces trois vinyles sont **retirés des pools
  de chine** tant qu'ils n'ont pas été offerts ; une fois le cadeau
  récupéré, le vinyle redevient trouvable en brocante. (Nouveauté : le jazz
  n'est pas exclu aujourd'hui.) Les vinyles des années 4+ restent trouvables
  en brocante en parallèle.
- **Suivi** : `declencheursDeclenches` — `cadeau_anniversaire` (existant,
  année 1), `cadeau_anniversaire_a2`, `cadeau_anniversaire_a3`,
  `cadeau_anniversaire_a<N>`… Pas de migration de save.
- **Rattrapage** : logique `>=` conservée — une partie déjà au-delà d'un
  anniversaire reçoit le cadeau en retard. **Un seul paquet à la fois**, le
  plus ancien d'abord ; le suivant apparaît après récupération.

## 5. Tests

- Calcul du premier week-end de septembre en jours de jeu : plusieurs années
  de jeu, samedi ET dimanche détectés, aucun autre jour, années bissextiles.
- Récurrence de l'anniversaire : années 1-3, 4+, bissextiles, rattrapage,
  un-paquet-à-la-fois.
- Exclusion puis réintégration des vinyles dans les pools de chine.
- Tirage année 4+ : jamais un vinyle déjà possédé ; à 24/24, doublon
  aléatoire en Pristin état (jamais de repli énergie).
- Effets braderie : taille de pool, raretés, rabais prix, bourses vente.
- Clés i18n présentes dans les 4 langues.

Rappel exécution : `vitest --maxWorkers=4` obligatoire sur cette machine.

## Hors périmètre

- Autres événements (Noël, foires…) : le module les accueillera en données,
  mais aucun n'est livré ici.
- Objets souvenirs exclusifs à la braderie : écartés pour cette version.
- Tout backend / configuration à distance (jeu solo, hors ligne).
