# Tutoriel — la montée de niveau devient une leçon

**Date** : 2026-08-10 · **Statut** : validé par Guillaume
**Branche** : `feat/tuto-brocante-scriptee` (suite du polish v3)

## Origine

La recette device a montré un conflit au retour de la journée de vente : la
fanfare de level-up et le dialogue de conclusion du grand-père se disputaient
l'écran. Un correctif (commit `e58b52e3`) diffère la célébration tant qu'un
dialogue ou le tutoriel est actif. Guillaume propose mieux : **faire de cette
montée de niveau une leçon du tutoriel** plutôt que de la repousser.

Le moment est idéal : le tutoriel rapporte ≥ 115 XP pour un niveau 1 à 100 XP —
le joueur passe donc niveau 1 à coup sûr, et c'est précisément à ce niveau que
l'onglet Compétences apparaît dans la barre (`TabBar`, `masque: niveau < 1`).

## Le flux

Trois étapes persistées s'insèrent entre `vente-nego` et `conclusion` :

```
vente-nego → (retour au bureau)
  niveau-celebration   la fanfare de level-up se joue, seule à l'écran
  competences-visite   le grand-père félicite, main sur l'onglet Compétences,
                       puis visite guidée en 3 bulles
  competences-choix    main sur la branche Présentation puis sur « Lecteur
                       d'âmes », achat du premier point
→ conclusion (carnet + lettre de Maman, inchangé)
```

1. **`niveau-celebration`** — au retour au bureau, `LevelUpOverlay` s'affiche
   normalement : la garde `!tutorielActif` posée en `e58b52e3` est levée pour
   cette étape précise (les gardes `!dialogueActif`/`!coachActif` restent :
   la fanfare ne doit toujours pas percuter un dialogue). Le tap de fermeture
   de la célébration (`marquerNiveauVu`) fait avancer à `competences-visite`.
2. **`competences-visite`** — le grand-père félicite et explique ce qu'un
   niveau apporte (`tuto_niveau_avant`). Puis la main de la TabBar pointe
   l'onglet Compétences, qui vient d'apparaître ; les autres onglets sont
   inertes (`ongletTutorielPermis` → `/bibliotheque`). Sur l'écran, un
   `TutorielCoach` en 3 bulles : la barre d'XP et le niveau, les arbres
   (général + un par catégorie), le point disponible à dépenser. À la fin du
   coach → `competences-choix`.
3. **`competences-choix`** — main sur la branche **Présentation**, puis sur le
   palier **« Lecteur d'âmes »** (le nom et l'ambiance du client s'afficheront
   en négociation — le seul effet visible à l'œil nu pour un débutant) ; les
   autres branches et paliers sont inertes. L'achat du point déclenche le
   débrief (`tuto_niveau_apres`) dont la fin avance à `conclusion`.

**Sortie sans dépenser** : le tutoriel attend l'achat. Si le joueur quitte
l'écran Compétences, la main de la TabBar l'y ramène (l'onglet reste le seul
permis) — même mécanique que les étapes stockage/collection.

## Architecture

Rien de neuf : on rejoue les patrons déjà en place.

- **Étapes** : `TutorielEtape` passe de 20 à 23 valeurs ; `ETAPES_TUTORIEL`
  suit le même ordre. Pas de bump de `SAVE_VERSION` (la v19 n'a jamais shippé
  et la migration normalise toute étape inconnue vers `termine`).
- **Scénario déclaratif** : la cible du premier point (`general.presentation.1`)
  et son arbre vivent dans `src/data/tutorielScenario.ts`
  (`COMPETENCE_PREMIER_POINT`), consommés par des helpers purs de
  `src/lib/tutoriel.ts` (`ongletTutorielPermis` gagne le cas
  `/bibliotheque` ; nouveau `competenceGuidee(etape)`).
- **Level-up** : `LevelUpOverlay` remplace sa garde `!tutorielActif(state)` par
  « bloqué pendant le tutoriel SAUF à l'étape `niveau-celebration` », et son
  bouton de fermeture avance l'étape quand on y est.
- **Écran Compétences** (`src/app/(qg)/bibliotheque/page.tsx`) : mêmes props de
  guidage que les écrans déjà traités — attributs `data-tuto-coach`
  (`competences-xp`, `competences-arbres`, `competences-point`), mains
  `tuto-main` sur la branche et le palier visés, gate des interactions non
  prescrites. ⚠ Piège connu, vérifié deux fois sur ce projet : tout conteneur
  portant `content-visibility: auto` ou `overflow: hidden` clippe la main —
  poser `contentVisibility: "visible"` et l'élévation sur l'élément ciblé,
  comme dans `CollectionGrid` et `StockageItemRow`.
- **Dialogues** : `tuto_niveau_avant` et `tuto_niveau_apres` dans
  `SEQUENCES_TUTORIEL` + les 3 overlays de langue.
- **i18n** : 3 instructions de bannière (une par étape) et 3 textes de coach,
  dans les quatre dictionnaires.

## Cas limites

- **Le joueur n'atteint pas le niveau 1** (rejouabilité future, équilibrage) :
  si `brocanteur.niveau === niveauVu` à l'arrivée au bureau, l'étape
  `niveau-celebration` avance immédiatement vers `conclusion` — les deux
  étapes de compétences sont sautées. Le tutoriel ne dépend jamais d'un
  level-up qui n'a pas eu lieu.
- **« Passer le tutoriel »** reste disponible à chaque étape ; le point de
  compétence non dépensé demeure au joueur (badge de la TabBar).
- **Kill/reprise** : les étapes sont persistées ; au remontage, la célébration
  ne rejoue pas si `niveauVu` est déjà à jour — l'étape avance alors seule.

## Tests

- Helpers purs : ordre des 23 étapes, `ongletTutorielPermis` pour les deux
  nouvelles étapes, `competenceGuidee`.
- La cible `general.presentation.1` existe bien au catalogue et coûte 1 point.
- Garde du level-up : bloqué pendant le tutoriel, autorisé à
  `niveau-celebration`, toujours bloqué si un dialogue ou un coach est ouvert.
- Saut propre quand aucun niveau n'est à célébrer.
- i18n : parité des nouvelles clés et séquences dans les 4 langues.

## Hors périmètre

Aucune refonte de l'écran Compétences ni de l'équilibrage des points ; la
leçon se pose par-dessus l'existant.
