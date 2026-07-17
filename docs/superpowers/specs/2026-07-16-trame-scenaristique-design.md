# Trame scénaristique — le grand-père transmet la boutique

**Date** : 2026-07-16
**Statut** : validé (brainstorm avec Guillaume)

## Objectif

Remplacer l'histoire actuelle (grand-père antiquaire *disparu* qui a laissé 5 lettres,
`src/data/quetesPrincipales.ts`) par une nouvelle trame : le grand-père est **vivant mais
âgé**, il transmet sa boutique à son petit-enfant (le joueur), il explique le **tutoriel**
et donne les missions de la **trame principale**. L'histoire devient la colonne vertébrale
de la progression : finir un acte débloque le tier de brocantes suivant.

## Décisions de design (validées)

1. **Présence** : le grand-père est un personnage **visible au QG** (élément cliquable
   dans la scène bureau), avec portrait et bulles de dialogue.
2. **Tutoriel** : guidé **pas-à-pas** sur la première boucle complète (chiner → négocier →
   revenir → vendre), commenté par le grand-père. Ferme (interactions hors parcours
   verrouillées) mais court, avec bouton « Passer le tutoriel » toujours visible.
3. **Fil rouge** : le rêve inachevé du grand-père — **les bijoux de la reine**
   (`uniq.mo.bijou_marie_antoinette`, conservé tel quel comme graal final).
4. **Délivrance des chapitres** : en **dialogue** avec le grand-père au QG (badge « ! »
   quand un chapitre est prêt). Le carnet de quêtes continue de suivre les missions.
   Le courrier reste le canal des commanditaires et des lettres d'invitation.
5. **Fin de l'arc** : le grand-père remet les clés et **part enfin en voyage** ; épilogue
   sous forme de **cartes postales** occasionnelles au courrier (renversement de
   l'ancienne trame : son départ est la fin heureuse, plus un mystère).
6. **Ton** : **doux et nostalgique**. Il enseigne par les souvenirs, encourage,
   s'émerveille. Pas de sarcasme (la gouaille reste aux vendeurs des brocantes — contraste
   voulu).
7. **Progression** : les tiers de brocante ne sont **plus débloqués par le niveau** mais
   par la **fin des actes**. À la fin d'un acte, le joueur reçoit une **lettre
   d'invitation envoyée par les organisateurs** qui ouvre le tier suivant.
8. **Lettre de Maman** : conservée (150 € + découverte du courrier), texte ajusté à la
   nouvelle histoire ; elle arrive à la fin du tutoriel.
9. Prénom proposé pour le grand-père : **Marcel** (à confirmer au moment de l'écriture).

## La trame — 12 chapitres en 3 actes

Les objets-cibles de chaque acte doivent être **garantis trouvables dans le tier de
l'acte** (à vérifier/ajuster par chapitre au moment du plan ; renforcer `atteignables.ts`).

### Acte I — L'apprentissage *(tier 1)*

| # | Titre | Objectif | Note narrative |
|---|-------|----------|----------------|
| 1 | La lampe de mon atelier | Chiner : lampe à pétrole, état Bon min | Première allusion au regret d'une vie |
| 2 | Vendre, c'est vivre | Ventes cumulées ≥ 300 € | Souvenir de sa première vente, ratée |
| 3 | Les mains d'or | Restaurer un objet à l'état Très bon | Il confie ses outils ; ses mains tremblent |
| 4 | Le pichet de ta grand-mère | Chiner : pichet en faïence | Première mention concrète des bijoux |

→ Livraison du ch. 4 : **lettre d'invitation des organisateurs, tier 2 débloqué.**

### Acte II — Se faire un nom *(tier 2)*

| # | Titre | Objectif | Note narrative |
|---|-------|----------|----------------|
| 5 | Un nom qui circule | Atteindre le niveau X (valeur fixée au plan SP3, sur la courbe de niveaux actuelle) | Les marchands parlent de toi |
| 6 | Le flair | Profit ≥ 100 € sur une seule vente | Le jour où il a laissé filer une pièce à 10× sa valeur |
| 7 | Une vitrine digne de ce nom | Valeur de collection ≥ 1 500 € *(déplacé depuis le ch. 9 le 2026-07-17 — « Pièce de maître » exigeait Réparer 3/N30, reporté en late game)* | La collection prend forme |
| 8 | Le beau monde | Chiner : gravure, état Très bon | Les rumeurs sur les bijoux circulent chez les collectionneurs |

→ Livraison du ch. 8 : **invitation des organisateurs, tier 3 débloqué.**

### Acte III — Le rêve *(tier 3 → 4)*

| # | Titre | Objectif | Note narrative |
|---|-------|----------|----------------|
| 9 | Pièce de maître | Restaurer un objet à l'état Comme neuf *(échangé avec le ch. 7 le 2026-07-17)* | « Un objet remis à neuf, c'est une vie qu'on prolonge » — se préparer pour le Grand Salon |
| 10 | L'invitation | Sans objectif (`cibles: []`, comme l'actuel ch. 4) : chapitre purement narratif, livré dès l'acceptation | Il raconte tout : 50 ans de quête, son échec. **Invitation au Grand Salon des Antiquaires (tier 4)** |
| 11 | Les bijoux de la reine | Chiner : `uniq.mo.bijou_marie_antoinette` (le joueur le garde) | Trouvés au Grand Salon |
| 12 | La remise des clés | Purement narratif | Il contemple les bijoux, remet les clés, annonce son voyage. Récompense généreuse + épilogue |

### Épilogue

Cartes postales occasionnelles du grand-père en voyage (Venise, Lisbonne, un souk…),
via le système de courrier existant. Contenu léger, garde le personnage vivant.

## Architecture

### a) Système de dialogue (nouveau, réutilisable)

- Overlay plein écran : portrait à gauche, bulle de texte, tap pour avancer.
- Données : séquences (`id`, répliques `{texte, humeur?}`) définies en FR dans
  `src/data/`, overlays i18n EN/ES résolus à l'affichage (même modèle que le courrier).
- **Règle d'or i18n respectée** : on ne persiste que des ids, jamais de chaîne localisée.
- Générique : servira à d'autres PNJ plus tard.

### b) Le grand-père au QG

- Élément cliquable dans la scène bureau (patron `QgCarnet`/`QgCourrier`) : le
  grand-père dans son fauteuil.
- Badge « ! » = chapitre prêt ; badge discret = petite phrase d'ambiance.
- Assets à générer : sprite scène QG + 3-4 portraits d'expressions (souriant, ému,
  songeur, rieur) — pipeline personas existant.

### c) Tutoriel guidé

- État `tutoriel` persisté en save (étape courante, terminé) → migration de save.
- Déroulé : dialogue d'accueil → Vide-grenier du quartier → premier achat guidé
  (surbrillance/flèche) → retour QG → première vente guidée → conclusion : remise du
  carnet + chapitre 1 + lettre de Maman.
- Pendant la brocante : portrait du grand-père en petit, commente chaque étape.
- Verrouillage des interactions hors parcours pendant le tutoriel ; « Passer le
  tutoriel » toujours visible (saute au même état final).

### d) Types d'objectifs de mission

`MissionCible` (« rapporter l'objet X ») devient un union `ObjectifMission` à 6 variantes :

1. Rapporter un objet (`templateId`, `etatMin?`) — existant
2. Ventes cumulées en € (depuis l'acceptation de la mission)
3. Profit ≥ X € sur une seule vente
4. Restaurer un objet jusqu'à un état donné
5. Valeur de collection ≥ X €
6. Atteindre le niveau X

Chaque variante calcule sa **progression** (« 320/500 € ») pour le carnet ; le `tick`
vérifie la complétion. Réutilisable par les quêtes des commanditaires. Idées en réserve
(non retenues pour la trame) : vendre un objet d'une catégorie, vendre à un archétype de
client, acheter sous le prix affiché, posséder N objets d'une catégorie.

### e) Déblocage par actes

- Nouvelle variante `ConditionDeblocage` : `{ type: "chapitrePrincipal", ordre: N }`
  (vrai si le chapitre N est livré).
- Les brocantes d'entrée de tier l'utilisent ; le **`niveauRequis` disparaît des
  brocantes** (les niveaux gardent leur rôle pour les compétences). Les conditions
  économiques internes aux tiers restent (elles échelonnent les brocantes d'un tier).
- Lettre d'invitation : injectée à la livraison du dernier chapitre de l'acte,
  expéditeur **« Les Organisateurs »** (nouvel expéditeur générique, signature déclinable
  selon la brocante). Purement narrative — le déblocage réel est la condition.
- ⚠ Rééquilibrage assumé : le rythme de progression est dicté par l'histoire, plus par
  l'XP. La trame devient obligatoire pour monter en tier.

### f) Migration des saves existantes

Un joueur au milieu de l'ancien arc bascule sur le nouveau : les anciens chapitres livrés
marquent comme livrés les chapitres équivalents du nouvel arc (mapping à définir dans le
plan SP2/SP3 ; a minima : ancien ch. N livré → nouveaux actes couverts jusqu'au tier déjà
atteint, pour ne jamais re-verrouiller une brocante déjà débloquée).

## Découpage en sous-projets

| SP | Contenu | Dépend de |
|----|---------|-----------|
| **SP1** | Système de dialogue + grand-père au QG + tutoriel guidé (textes du tutoriel inclus) | — |
| **SP2** | Mécanique de la trame : `ObjectifMission`, condition `chapitrePrincipal`, retrait des gates de niveau, lettres d'invitation, délivrance des chapitres en dialogue | SP1 (dialogue) |
| **SP3** | Contenu narratif : 12 chapitres écrits (dialogues + carnet), épilogue cartes postales, remplacement de l'ancien arc, i18n EN/ES, migration des saves | SP1 + SP2 |

Chaque SP suit son propre cycle spec → plan → implémentation. L'ordre « tutoriel en
priorité » a été choisi par Guillaume (criticité onboarding pour la sortie App Store
~juillet 2026) ; le risque « écrire le tuto avant la voix du personnage » est couvert par
le présent document, qui fixe le ton et la trame avant SP1.

## Hors périmètre

- Refonte des quêtes quotidiennes/hebdo des commanditaires (elles bénéficieront
  d'`ObjectifMission` plus tard, sans changement ici).
- Nouveaux PNJ dialogués autres que le grand-père.
- Toute modification des mécaniques de chinage/vente/atelier elles-mêmes.
