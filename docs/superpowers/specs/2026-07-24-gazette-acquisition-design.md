# Refonte de l'acquisition de la Gazette du Chineur

**Date :** 2026-07-24
**Statut :** validé (approche A — état minimal dérivé)

## Objectif

Remplacer l'achat libre de la gazette via le porte-revues par un circuit
narratif : la gazette n'existe pas tant qu'aucune compétence liée n'est
débloquée ; au premier déblocage, le grand-père offre la première édition via
un mini-tuto (journal enroulé au sol devant la porte) ; ensuite, achat
hebdomadaire chaque lundi (accepter/refuser), lecture via le journal posé sur
le coin du bureau.

## Décisions validées

- **Déclencheur** : le premier déblocage parmi un « Veilleur — catégorie »
  (Connaisseur palier 1) OU un palier de « Vision du marché ».
- **Avant déblocage** : gazette totalement absente (pas de porte-revues, pas
  d'achat possible).
- **Porte-revues** : supprimé du panorama (composant et assets conservés dans
  le repo, plus montés).
- **Refus le lundi** : refus explicite → le journal disparaît, édition
  manquée, prochaine chance le lundi suivant.
- **Ignoré le lundi** : pas de clic avant la fin du lundi → édition manquée
  (le journal ne s'affiche que le lundi).
- **Journal sur le bureau** : visible seulement si l'édition de la semaine en
  cours est achetée (ou offerte).
- **Achat du lundi** : petite modale de confirmation (Acheter / Refuser).
- **Contenu du tuto** : toutes les sections présentées en teaser (tendances,
  météo, carnet mondain, influence), en précisant celles qui se débloquent
  avec les compétences.

## Section 1 — État & déclenchement

**Dérivation du déblocage (aucun champ en save)** : nouvelle fonction
`aAccesGazette(state)` dans `src/lib/competences.ts`, vraie dès qu'au moins un
« Veilleur — catégorie » ou un palier de « Vision du marché » est débloqué.
Elle pilote toute la visibilité gazette.

**Deux champs additifs en save (migration v16)** :

- `tutoGazette: "aFaire" | "faite"` — initialisé à `"aFaire"`. Tant que
  `aAccesGazette` est faux, rien ne se passe ; dès que c'est vrai et que
  `tutoGazette === "aFaire"`, le journal enroulé (gratuit) apparaît au sol
  devant la porte, quel que soit le jour.
- `gazetteRefusee: boolean` — remis à `false` à chaque refresh hebdo (même
  endroit que le reset de `gazetteAchetee`, aligné sur les lundis via
  `prochainLundi`).

**Saves existantes** : un joueur ayant déjà une compétence gazette voit le
tuto au prochain retour au panorama (journal gratuit au sol).

**Gazette offerte** : l'ouverture marque `gazetteAchetee = true` **sans**
débit ni écriture au grand livre. À la fermeture, `tutoGazette = "faite"` et
le journal s'installe sur le bureau pour le reste de la semaine.

## Section 2 — Composants UI & flux

**`QgJournalSol` (nouveau)** : journal enroulé au sol devant la porte.
Position `layout.ts` ≈ `{ left: 138, bottom: 10, width: 14 }` (à ajuster
visuellement). Deux modes :

- *Mode tuto* (gratuit) : tap → ouvre la `GazetteSheet` avec les dialogues du
  grand-père par-dessus.
- *Mode lundi* : tap → modale « La gazette de la semaine — X pièces » avec
  Acheter / Refuser. Acheter (budget suffisant) → débit + ouverture de la
  sheet. Refuser → `gazetteRefusee = true`, le journal disparaît. Budget
  insuffisant → bouton Acheter grisé, prix en rouge.

**Tuto dans la sheet** : `DialogueSequence` du grand-père
(`SEQUENCES_TUTORIEL`, 4 langues), bulle ancrée en bas de la `GazetteSheet`,
une ligne par section (tendances, météo, carnet mondain, influence) en teaser
« se débloque avec telle compétence ». Tap pour avancer ; fermeture de la
sheet bloquée tant que les lignes ne sont pas finies.

**`QgJournalBureau` (restauré de git, ex-`QgJournal` supprimé par df0bf00)** :
coordonnées d'origine `{ left: 16.4, bottom: 8.2, width: 21.9 }`, asset
`journal.webp` (présent dans `public/qg/`). Visible seulement si
`gazetteAchetee === true`. Tap → rouvre la `GazetteSheet` en lecture.

**Suppression** : `QgPorteRevues` retiré du layout du panorama. La
`GazetteSheet` perd son état « à acheter » (bouton d'achat interne) puisqu'elle
ne s'ouvre plus que sur une édition achetée.

**Assets** : `journal.webp` réutilisé pour les deux emplacements dans un
premier temps ; un « journal enroulé ficelé » distinct pour le sol pourra être
généré ensuite (pipeline Gemini).

## Section 3 — Cycle hebdo, cas limites & tests

**Visibilité du journal au sol** (dérivée, aucun timer) :

- Mode tuto : `aAccesGazette && tutoGazette === "aFaire"` — tous les jours,
  tant que le tuto n'est pas fait.
- Mode lundi : `tutoGazette === "faite" && jourSemaine === lundi &&
  !gazetteAchetee && !gazetteRefusee`. Le mardi la condition tombe d'elle-même.

**Cas limites** :

- Compétence débloquée un lundi : le mode tuto a priorité ; la gazette offerte
  marque `gazetteAchetee = true` → pas de deuxième proposition ce lundi-là.
- Le refresh hebdo (qui prélève aussi le loyer) remet `gazetteAchetee` **et**
  `gazetteRefusee` à `false` → le journal du bureau disparaît si l'édition
  n'est pas rachetée, le journal au sol réapparaît le lundi.
- Pendant les dialogues du tuto, les autres interactions du panorama sont
  bloquées (mécanique `tutoActif` existante).

**i18n** : nouvelles chaînes FR/EN/ES/EL — modale d'achat (titre, prix,
Acheter/Refuser, budget insuffisant), aria-labels des deux journaux, séquence
de dialogues du tuto (~5-6 lignes par langue). Jamais de chaîne localisée en
save.

**Tests** :

- `aAccesGazette` : aucune compétence / Veilleur seul / Vision seule.
- Migration v16 : champs additifs, vieilles saves.
- Règles de visibilité sol/bureau : tuto, lundi, refus, mardi.
- Gazette offerte : `gazetteAchetee` passe à vrai sans débit ni ligne au grand
  livre.
- Achat lundi : débit + ligne au grand livre ; refus : `gazetteRefusee`.
- Mise à jour des tests existants : `GazetteSheet` (suppression du mode « à
  acheter »), layout panorama (porte-revues retiré).
