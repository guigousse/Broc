# Tutoriel v2 — première brocante scriptée, leçon de collection, coffre à traces

**Date** : 2026-08-08 · **Statut** : validé par Guillaume (design section par section)
**Branche** : `feat/tuto-brocante-scriptee` (base `main`)

## Objectif

Rendre les premières minutes du jeu beaucoup plus guidées et déterministes :

1. La première session de chinage présente **6 objets fixes**, identiques pour tous les
   joueurs, et fait vivre les trois scénarios d'achat dans l'ordre : échec de
   négociation (objet perdu), achat direct, négociation réussie (×2).
2. Au retour au bureau, une **visite guidée du stockage** puis une **leçon de
   collection** : le joueur envoie sa peluche en collection et voit la valeur de
   collection débloquer une brocante en direct (réputation).
3. La préparation de l'étal enseigne le placement dans le coffre par **traces
   fantômes**, la seconde trace étant pivotée pour enseigner la **rotation à deux
   doigts** (animation pédagogique dédiée).
4. Le **colis du grand-père disparaît** du parcours : les 3 achats du joueur le
   remplacent.

## Architecture retenue (approche « scénario déclaratif »)

- **`src/data/tutorielScenario.ts`** (nouveau) — la vérité du script : les 6 objets de
  la session (templateId, état, prix vendeur, prix affiché, persona vendeur avec
  tempérament), le scénario attendu par étape (négo-échec / achat direct /
  négo-réussite), les bornes du curseur par étape, les deux traces du coffre
  (position normalisée + rotation + tolérances), les ids de séquences de dialogue.
- **Helpers purs dans `src/lib/tutoriel.ts`** — les pages posent des questions au lieu
  de porter la logique : objet actif de l'étape, bornes du curseur, achat direct
  permis ?, deck verrouillé ?, trace active. Tout est testable unitairement.
- **`genererSessionScriptee()`** dans `src/lib/chine.ts`, sœur de `genererSession()`,
  réutilise `instancier()` (à exporter ou à décliner en variante à paramètres
  forcés). Point d'appel unique : `src/app/chiner/[brocanteId]/ClientPage.tsx`
  (entrée de session), gaté par `tutorielActif(state)`.
- **`src/lib/coffreTuto.ts`** (nouveau) — logique pure « l'objet est-il posé sur sa
  trace ? » (distance + angle + tolérances).
- **`TutorielCoach`** (nouveau composant) — voile sombre à découpe lumineuse
  (box-shadow géant) + bulle de texte, tap pour avancer ; z-index 100 (au-dessus de
  `FloatingRoomOverlay` 35, sous `DialogueOverlay` 120) ; respecte
  `prefers-reduced-motion`.

Les God-components (`chiner/[id]/ClientPage.tsx`, `journee/ClientPage.tsx`,
`CoffreChargement.tsx`, layout QG) ne font que consommer les helpers — ils restent
minces, conformément à l'audit du 2026-08-03.

## Invariants conservés

- L'étape vit dans la save (`tutorielEtape`), la progression **ne recule jamais**,
  `avancerTutoriel("termine")` reste un no-op (passer par `terminerTutoriel()`).
- **Fail-open absolu** : toute save douteuse est normalisée à `termine` ; « Passer le
  tutoriel » reste disponible à chaque étape et `appliquerFinTutoriel` livre tout ce
  qui manque (lettre de Maman, reliquat de colis des vieilles saves).
- `portePermise` couvre toutes les étapes de chine et d'étal : sortir en cours de
  script reste possible et rejouable (anti-soft-lock).
- Boîte mystère / vendeur mystère toujours désactivés pendant le tutoriel.
- Jamais de chaîne localisée en save — uniquement des ids.

## Le nouveau flux (`TutorielEtape`, 9 → 17 valeurs)

```
accueil                (inchangé)
aller-chiner           (inchangé — porte → vide-grenier du quartier)
chine-nego-echec       objet 1 : négo trop basse guidée → vendeur fâché, objet perdu
chine-achat-direct     objet 2 : carafe en cristal, achat au prix affiché
chine-nego-un          objet 3 : manette Vibraduo, négo réussie
chine-nego-deux        objet 4 : peluche mohair, négo réussie
chine-sortir           swipe libre sur 5-6, achat désactivé, main sur « Sortir »
stockage-ouvrir        dialogue retour, main sur l'onglet Stockage de la TabBar
stockage-focus         visite guidée TutorielCoach du stockage
collection-envoyer     main sur « → Collection » de la peluche
collection-lecon       page Collection : valeur, déblocage réel, réputation
preparer-etal          porte → « Étaler » (inchangé)
coffre-trace-un        trace du 1er objet, poser dessus (snap)
coffre-trace-deux      trace pivotée ~40° + animation rotation 2 doigts
premiere-vente         (inchangé — journée d'étal)
conclusion → termine   (inchangé — lettre de Maman, mini-tuto carnet, chapitre 1)
```

Les étapes `premier-achat`, `rentrer`, `ouvrir-colis` disparaissent (voir Migration).

## Section chine — la brocante scriptée

### Les 6 objets, dans l'ordre du deck

| # | Objet (templateId) | Prix réf. | Rôle | Scénario |
|---|---|---|---|---|
| 1 | Tourne-disque à courroie vintage (`mus.tourne_disque_a_courroie_vintage`) | 90 € | perdu | négo bornée trop basse → vendeur fâché |
| 2 | Carafe en cristal taillé (`ma.carafe_cristal_taille`) | 35 € | acheté | achat direct au prix affiché |
| 3 | **Manette Vibraduo** (`jx.manette_vibraduo`, **nouveau template**) | ~45 € | acheté | négo réussie |
| 4 | Ours en peluche mohair (`jx.ours_en_peluche_mohair_recent`) | 65 € | acheté | négo réussie → ira en collection |
| 5 | Radio-cassette années 80 (`mus.radio_cassette_annees_80`) | 30 € | décor | non achetable |
| 6 | Lampe baladeuse d'atelier (`br.lampe_baladeuse_atelier`) | 18 € | décor | non achetable |

- Tout est forcé : état, prix vendeur, `prixAffiche: true` partout, persona (nom,
  portrait, tempérament — n°1 irritable, n°3/n°4 tempéraments différents pour varier
  les répliques).
- Le tourne-disque perdu est un choix narratif : bel objet de l'univers vinyle, sa
  perte pique, le grand-père dédramatise. La lampe à pétrole est **évitée** (cible du
  chapitre 1).
- L'état de la peluche est **« Très bon »** pour garantir le franchissement du seuil
  de déblocage (voir leçon de collection).
- Vérifier à l'implémentation que les 5 templates existants ont une illustration
  (`ITEMS_WITH_IMAGE`) ; générer celle de la manette Vibraduo (pipeline Gemini
  habituel, marque fictive, pièges de détourage connus).

### Guidage du deck

- Étapes 1-4 : deck **verrouillé** sur la carte active (swipe et flèches inertes),
  mains existantes sur le geste prescrit. Bouton « Acheter » grisé quand le scénario
  est une négo (1, 3, 4) ; tiroir de négo inerte quand c'est l'achat direct (2).
- `chine-sortir` : swipe libre pour feuilleter 5-6, achat désactivé (réplique du
  grand-père : on a assez dépensé), main pulse sur « Sortir ». Bilan de session puis
  retour bureau, inchangés.

### Négos garanties (bornes du curseur)

- `NegoBar` expose déjà `minJoueur`/`maxJoueur` — le script borne la plage par étape.
- **Objet 1** : le grand-père pousse à tenter très bas ; plage bornée strictement
  sous le seuil de colère (< 50 % du prix affiché, cf. `SEUIL_COLERE_VENDEUR`) →
  `fache` garanti, l'objet passe `refuse` et disparaît du deck, dialogue-leçon.
- **Objets 3 et 4** : plage bornée dans la zone non insultante, et paramètres
  vendeur scriptés (cible secrète, tolérance, tours) choisis pour que `conclu` tombe
  en 2-3 échanges. **Test de force brute** : aucune séquence d'offres dans les bornes
  ne peut aboutir à `fache` ou `refus_poli`.
- Budget : les 3 achats coûtent ~110 € au total (35 + manette négociée + peluche
  négociée) ; vérifier que le budget initial de `nouvellePartie()` couvre large,
  l'ajuster sinon.

### Cas limites

- Sortie anticipée : l'étape est conservée ; au retour, la session scriptée se
  reconstruit à l'identique (déterministe) et reprend à l'objet courant — les objets
  déjà achetés/perdus ne réapparaissent pas.
- XP : 3 achats + 2 négos réussies ; la barre XP est déjà gelée en session, vérifier
  qu'aucun overlay de level-up n'interrompt le script.

## Section bureau — stockage puis collection

- **Retour** : dialogue réécrit (plus de colis) ; TabBar inerte **sauf** l'onglet
  Stockage, qui porte la main (`mainMiniTuto`, z-index 30→40 documenté).
- **`stockage-focus`** : TutorielCoach en 4 temps — ① jauge de capacité, ② filtre
  catégories, ③ ligne d'objet (état/valeur), ④ bouton d'amélioration (pour plus
  tard).
- **`collection-envoyer`** : le grand-père s'attendrit sur la peluche et suggère de
  ne pas la vendre ; main sur « → Collection » de sa ligne, autres actions inertes.
- **`collection-lecon`** : TabBar guide vers Collection ; TutorielCoach — ① la case
  remplie, ② la valeur totale, ③ la leçon : la valeur de collection fait ta
  **réputation** et **débloque des brocantes**. Payoff réel : la peluche (Très bon,
  prime de donation) franchit le seuil de 30 € du « Marché aux puces du dimanche »,
  le déblocage se produit à cet instant et le grand-père le souligne.
- **Transition** : main TabBar vers Bureau, porte pulse, `PorteSheet` « Étaler »
  actif / « Chiner » grisé (pattern existant).

## Section coffre — traces fantômes et rotation

- Carrousel : exactement 2 objets (manette + carafe).
- **`coffre-trace-un`** : à la saisie du 1ᵉʳ objet (tap ou début de drag), sa trace
  apparaît — silhouette sombre semi-transparente à contour pointillé, fabriquée à
  partir de l'image de l'objet (réutiliser le détourage des masques alpha du
  coffre). Pose : tolérance de distance ~8 % (coordonnées normalisées) → **snap**
  doux + son + pulse. Le tap-ajout au centre reste permis (l'objet atterrit au
  centre puis se glisse sur la trace).
- **`coffre-trace-deux`** : trace pivotée ~40°. Animation pédagogique en boucle
  courte au-dessus du coffre : une main fantôme déplace l'objet à un doigt, un
  second doigt se pose, l'ensemble tourne — CSS + `main-pointeuse.webp` dupliquée,
  pas de vidéo ; interrompue au premier toucher, rejouée après ~8 s d'inactivité
  tant que l'objet n'est pas posé. Tolérance angulaire ±10° en plus de la distance.
  La rotation à deux doigts est la mécanique réelle existante de `CoffreCanvas`.
- « Valider » n'est actif que quand les 2 objets sont sur leur trace (tutoriel
  uniquement) ; pricing ensuite inchangé (main sur Valider).
- Les positions des traces sont scriptées en coordonnées normalisées et vérifiées
  par test : dans les bornes du coffre de départ (scale `getScaleCoffre`), sans
  chevauchement.

## Migration & compatibilité

- **`SAVE_VERSION` 18 → 19.**
- Saves en cours d'ancien tutoriel : `accueil` reste `accueil` ; toute autre étape
  d'ancien tuto (`aller-chiner` … `conclusion`) → `appliquerFinTutoriel` (fail-open :
  lettre de Maman + reliquat de colis livrés, personne de bloqué).
- `colisTutorielLivres` conservé pour compatibilité mais plus alimenté en partie
  neuve ; `QgColis` et l'étape `ouvrir-colis` retirés du parcours.
- Mettre à jour le test qui fige `SAVE_VERSION` en dur (`migrations.test.ts`).

## i18n

- Nouvelles instructions de bannière (une par étape) et nouvelles séquences de
  dialogue du grand-père dans `src/data/dialogues.ts` + déclinaisons
  `src/lib/i18n/contenu/{en,es,el}/dialogues.ts` et `src/lib/i18n/ui/{fr,en,es,el}.ts`
  (le typage sur la forme du FR casse la compilation en cas d'oubli).

## Tests

- Scénario : force brute sur toutes les offres bornées des négos 3/4 (jamais de
  refus), échec garanti de la négo 1.
- Helpers purs du script (objet actif, bornes, permissions par étape).
- `coffreTuto` (distance/angle/tolérances) + validité des traces (bornes, non-
  chevauchement).
- Migration v19 (fast-forward des saves mi-tuto, `accueil` conservé).
- Payoff du déblocage : peluche « Très bon » ⇒ valeur de donation ≥ 30 €.
- Rappel : `vitest --maxWorkers=4` obligatoire sur ce Mac.

## Hors périmètre

- Aucune nouvelle stat « réputation » (la valeur de collection reste le proxy,
  portée par les dialogues).
- Pas de refonte de la journée de vente (`premiere-vente` inchangé).
- Pas de généralisation du TutorielCoach au-delà des deux visites guidées.
