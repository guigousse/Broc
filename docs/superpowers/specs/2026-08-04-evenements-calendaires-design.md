# Événements calendaires — Grande Braderie & anniversaire annuel

**Date** : 2026-08-04
**Statut** : validé par Guillaume

## Contexte et objectif

Le jeu n'a pas de système d'événements calendaires : les seuls rendez-vous
sont la célébrité hebdomadaire, la météo et l'anniversaire one-shot du
11 juin (jour 6 de jeu). Objectif : poser un petit module d'événements
générique et livrer deux événements :

1. **La Grande Braderie** (inspirée de la braderie de Lille) — événement en
   **temps réel**, chaque premier week-end de septembre, sous la forme d'une
   brocante événementielle temporaire.
2. **L'anniversaire annuel** — l'anniversaire du 11 juin devient récurrent
   **chaque année du calendrier de jeu**, avec un vinyle en cadeau.

Note d'univers : le jeu ne se situe plus à une époque précise (l'année n'est
jamais affichée) — un événement calé sur la vraie date de l'appareil ne jure
donc pas avec la fiction.

## Décisions structurantes

- **Deux horloges assumées** : la braderie vit en **heure locale réelle de
  l'appareil** (précédent : `src/lib/quetes/periode.ts`) ; l'anniversaire vit
  dans le **calendrier de jeu** (`src/lib/calendrier.ts`, temps linéaire
  démarrant au 6 juin, année interne jamais affichée).
- **Aucun bump de `SAVE_VERSION`** : tout le suivi passe par le tableau
  existant `declencheursDeclenches`.
- La gazette vit au rythme du jeu alors que la braderie vit au rythme réel :
  l'encart d'annonce braderie est **calculé à l'affichage**, jamais stocké
  dans l'édition.

## 1. Module d'événements

Nouveaux fichiers `src/data/evenements.ts` + `src/lib/evenements.ts`.

- `fenetreBraderie(annee)` : fonction pure → fenêtre « premier samedi de
  septembre 00:00 → dimanche 23:59:59 », en heure locale.
- `braderieActive(maintenant: Date)` : vrai pendant la fenêtre.
- `prochaineBraderie(maintenant: Date)` : prochaine fenêtre (pour l'encart
  gazette et la planification de la notification).
- `estAnniversaire(jour)` / `anneeAnniversaire(jour)` côté calendrier de
  jeu : chaque 11 juin de chaque année (via `dateForJour`, comparaison
  mois/jour UTC — gère les années bissextiles).

Récurrence annuelle automatique, aucune date en dur à maintenir.

## 2. La Grande Braderie (brocante événementielle)

Brocante spéciale `grande-braderie`, définie **à part** du tableau
`BROCANTES` permanent, visible dans les listes chine et vente uniquement
pendant la fenêtre.

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

- **Carte / listes** : l'entrée apparaît dans les listes chine et vente
  pendant le week-end, avec un badge « Événement ».
- **Gazette** : encart (sur le modèle de l'annonce célébrité,
  `GazetteSheet.tsx`) visible quand la braderie est en cours **ou à moins de
  7 jours réels** — « La Grande Braderie ouvre ce week-end ! ». Calculé à
  l'affichage (cf. décisions structurantes).
- **Notification locale** : samedi matin ~9 h locale, « La Grande Braderie a
  commencé ! », via le système de notifications existant
  (`src/lib/notifications/`).
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
| Repli | Si les 24 vinyles sont possédés : recharge d'énergie complète | — | — |

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

- Calcul du premier week-end de septembre : plusieurs années, bornes de
  fenêtre, changement d'heure (DST — précédent `plusHeureLocale`).
- Récurrence de l'anniversaire : années 1-3, 4+, bissextiles, rattrapage,
  un-paquet-à-la-fois.
- Exclusion puis réintégration des vinyles dans les pools de chine.
- Tirage année 4+ : jamais un vinyle déjà possédé ; repli énergie à 24/24.
- Effets braderie : taille de pool, raretés, rabais prix, bourses vente.
- Clés i18n présentes dans les 4 langues.

Rappel exécution : `vitest --maxWorkers=4` obligatoire sur cette machine.

## Hors périmètre

- Autres événements (Noël, foires…) : le module les accueillera en données,
  mais aucun n'est livré ici.
- Objets souvenirs exclusifs à la braderie : écartés pour cette version.
- Tout backend / configuration à distance (jeu solo, hors ligne).
