# Commanditaires vendeurs — les personnages de quêtes chinent aussi (mode chinage)

**Date** : 2026-07-03
**Statut** : validé par Guillaume

## Objectif

Intégrer les 4 commanditaires de quêtes à domaine (`src/data/expediteursCourrier.ts`)
comme vendeurs spécialistes du mode chinage, via la mécanique d'affinité de
catégorie posée par la spec `2026-07-03-vendeurs-nommes-design.md`. Le joueur
croise en brocante les personnages qui lui écrivent des lettres.

## 1. Périmètre

| Expéditeur (id) | Nom | Domaine | Archétype vendeur (nouvel id) |
|---|---|---|---|
| jeux-video | Le Joueur du Vide-grenier | Jeux & Loisirs | `joueur` |
| set-designer | Clara | Maison | `setdesigner` |
| mode | Arianne | Mode | `modeuse` |
| art | Paul-Henry | Objets d'art | `esthete` |

Exclus : Maman et Grand-père (pas de domaine ; Grand-père est « disparu » dans
le lore). Barnabé 33-Tours reste le spécialiste Musique. Les spécialistes
fictifs envisagés en hors-périmètre de la spec précédente (Kiki la Manette,
Père Firmin, Rosalie Petites-Mains) sont remplacés par ces personnages réels —
Livres & Papeterie et Bricolage restent sans spécialiste.

## 2. Source unique noms + avatars

`src/lib/personas.ts` importe `EXPEDITEURS` depuis
`@/data/expediteursCourrier` et déclare un mapping :

```ts
/** Archétypes vendeurs incarnés par un commanditaire de quêtes. */
const EXPEDITEUR_PAR_ARCHETYPE: Partial<Record<VendeurArchetypeId, string>> = {
  joueur: "jeux-video",
  setdesigner: "set-designer",
  modeuse: "mode",
  esthete: "art",
};
```

- `NOM_VENDEUR` référence `EXPEDITEURS[...].nom` pour ces 4 entrées (pas de
  copie de chaîne). Renommer un commanditaire côté courrier renomme le vendeur.
- Les illustrations (`src/lib/personaIllustrations.ts`) référencent
  `EXPEDITEURS[...].avatar` (chemins `public/personas/commanditaires/*.webp`)
  pour la map calme ET la map fâchée (pas de variante fâchée pour l'instant —
  à générer plus tard, comme celles de la fournée précédente). `avatar` étant
  optionnel dans `ExpediteurDef`, repli sur le placeholder mystère
  (`?? ILLUSTRATION_PLACEHOLDER`) pour satisfaire le type — les 4 concernés ont
  tous un avatar défini.

## 3. Nouveaux archétypes

`VendeurArchetypeId` étendu avec : `joueur`, `setdesigner`, `modeuse`, `esthete`.

Stats (médianes, jitter ±10 % existant) :

| Archétype | margePct | elanPct | patience | tolerancePct | sangFroid |
|---|---|---|---|---|---|
| joueur | 0.35 | 0.50 | 4 | 0.65 | 0.75 |
| setdesigner | 0.50 | 0.65 | 3 | 0.70 | 0.80 |
| modeuse | 0.20 | 0.30 | 4 | 0.45 | 0.85 |
| esthete | 0.10 | 0.30 | 3 | 0.30 | 0.45 |

Caractères : le Joueur = passionné sympa ; Clara = pressée, tourne son stock ;
Arianne = pointue, descend lentement ; Paul-Henry = expert cassant et soupe au
lait (sang-froid bas : il peut claquer la négo).

`NOM_ARCHETYPE` (rôles) : joueur → « Le Joueur », setdesigner → « La Set
Designer », modeuse → « La Designeuse », esthete → « L'Esthète ».

Poids `POIDS_PAR_TIER` : 0 partout pour les 4 (spawn uniquement via affinité,
comme le disquaire).

## 4. Affinités

Ajouts dans `AFFINITE_CATEGORIE` :

```ts
joueur:      { categorie: "Jeux & Loisirs", boostPoids: 25, facteurCoteMin: 0.85 },
setdesigner: { categorie: "Maison",         boostPoids: 25, facteurCoteMin: 0.80 },
modeuse:     { categorie: "Mode",           boostPoids: 25, facteurCoteMin: 0.95 },
esthete:     { categorie: "Objets d'art",   boostPoids: 25, facteurCoteMin: 0.95 },
```

Le `facteurCoteMin` varié donne une identité : intraitables (0.95) chez
Arianne/Paul-Henry ; le Joueur laisse passer de légères sous-cotes (0.85) ;
Clara (0.80) est le seul spécialiste chez qui on trouve presque des pépites.

Biais d'ambiance (`BIAIS_AMBIANCE`) : Geek → joueur +8 ; Mondain → esthete +6.
L'invariant existant s'applique (biais gaté par l'affinité : jamais hors
catégorie).

## 5. Tests

- `personas.test.ts` : `NOM_VENDEUR` des 4 nouveaux = `EXPEDITEURS[...].nom`
  (dérivation vérifiée) ; noms toujours tous distincts (14 archétypes) ;
  chaque nouveau spécialiste ne sort jamais hors de sa catégorie et sort
  régulièrement dessus (mêmes patterns que le disquaire) ; les biais Geek et
  Mondain ne font pas fuiter joueur/esthete hors catégorie.
- `chine.test.ts` : plancher de cote respecté par spécialiste (ex. items
  `setdesigner` → prixVendeur ≥ ~0.80 × référence ; items `esthete` ≥ ~0.95 ×
  référence), catégorie de l'item = domaine du spécialiste.
- `personaIllustrations` : les 4 archétypes retournent l'avatar commanditaire
  (pas le placeholder mystère).

## Hors périmètre

- Toute interaction quêtes ↔ vendeur (remise si quête active du commanditaire,
  dialogue spécial…) — plus tard, éventuellement.
- Variantes fâchées des avatars (génération d'assets à part).
- Spécialistes Livres & Papeterie et Bricolage.
