# Machine ∞ — image épique & célébration d'achat

**Date** : 2026-08-04 · **Statut** : validé par Guillaume (brainstorming du 2026-08-04)
**Contexte** : l'IAP « Énergie infinie » est implémenté (branche `feat/iap-energie-infinie`,
spec `2026-08-03-iap-energie-infinie-design.md`). L'achat bascule aujourd'hui la fiche
machine en mode ∞ sans cérémonie. On veut un événement épique à l'achat, et une machine
transfigurée à vie.

## Décisions (brainstorming)

1. **Permanence** : après l'achat, la nouvelle image « machine ∞ » est l'image
   permanente de la fiche machine, à chaque réouverture, pour toujours. La transition
   éclair ne se joue qu'une fois, au moment de l'achat.
2. **∞ peint dans l'image** : le symbole ∞ fait partie de l'illustration (grand cadran
   central lumineux). En mode ∞ : plus d'aiguille SVG ni de pastille compteur.
   Seule la ligne texte « Énergie infinie » (i18n `d.chrome.energieInfinie`) reste si
   elle respire bien visuellement, sinon rien (à juger à l'intégration sur capture).
3. **Restauration discrète** : « Restaurer les achats » (réglages) et la revalidation
   au boot ne déclenchent AUCUN événement — la machine ∞ s'affiche simplement à la
   prochaine ouverture. L'événement épique n'existe que dans le parcours d'achat de
   `EnergieRecharge`.

## 1. Image `machine-energie-infinie.webp`

- **Source** : image-to-image Gemini depuis `public/qg/machine-energie.webp`
  (1024×1365, ratio 3:4). Même meuble, même cadrage, mêmes proportions.
- **Direction** : la machine s'est « éveillée » — teintes bleu électrique/cyan sur les
  cuivres, arcs électriques permanents entre les bobines du sommet, grand cadran
  désormais **au centre du meuble**, verre dépoli rétroéclairé cyan, symbole **∞**
  lumineux peint dans le cadran.
- **Contraintes** : sortie recadrée/redimensionnée en 1024×1365 exactement (sharp),
  export webp qualité alignée sur l'existant. Pièges Gemini connus ([[gemini-image-prompt-pieges]]) :
  pas de négations répétées, géométrie corrigée au rognage, pas de géométrie
  contradictoire.
- **Livraison** : `public/qg/machine-energie-infinie.webp`. Génération itérative pilotée
  par le contrôleur (jugement visuel), pas par un sous-agent.

## 2. Son `eclair.mp3`

- Source : `/Users/guillaume/Desktop/patricksilvey-weather-lightning-2-464187.mp3`
  (4,15 s, claquement puis roulement de tonnerre, 256 kbps).
- Vendorisé en `public/sounds/eclair.mp3` (ré-encodage léger acceptable si le poids
  baisse sans perte audible ; sinon copie telle quelle).
- `audioManager.playEclair()` : même motif que les autres one-shots, **avec éviction du
  tampon après lecture** (motif `depart-voiture`, audit H3) — son joué au plus une fois
  par vie d'app.

## 3. Séquence de célébration (EnergieRecharge uniquement)

État local `celebration` dans `EnergieRecharge` ; la fiche contrôle son affichage
pendant la séquence, indépendamment du drapeau global.

- Statut d'achat `"achete"` → `definirEnergieInfinie(true)` **immédiat** (logique de
  jeu, header, GameContext basculent tout de suite — inchangé), puis la fiche entre en
  célébration :
  - **t = 0** : `playEclair()` + `playRecharge()` démarrent dans le même tick que le
    **flash n° 1** (voile blanc-bleu plein cadre, ~180 ms). La synchro son/flash est
    garantie par le point de départ commun — aucune minuterie calée sur l'audio.
  - **t ≈ 90 ms** (pic du flash, écran saturé) : swap de l'image machine →
    `machine-energie-infinie.webp`. L'ancienne machine n'est jamais visible « en train
    de changer ».
  - **t ≈ 350 ms et ≈ 700 ms** : deux flashs d'écho plus faibles pendant que le
    tonnerre roule. Les étincelles ⚡ existantes (`setEtincelles`) jouent en renfort.
  - Fin de séquence (~1,5 s de visuel) : la machine ∞ reste affichée, définitive.
- Pendant la célébration comme en mode ∞ : cartel pub, zone levier et bouton d'achat
  absents ; aiguille et pastille compteur absents (décision 2).
- Acheteur qui rouvre la fiche plus tard : machine ∞ directe, aucun flash, aucun son.
- Les timings du flash vivent dans des constantes nommées (testables, ajustables).

## 4. Tests (TDD)

- L'achat réussi déclenche `playEclair` ET `playRecharge` (spys audioManager).
- L'image passe de `machine-energie.webp` à `machine-energie-infinie.webp` pendant la
  séquence (fake timers sur les constantes de timing).
- Mode ∞ (drapeau posé avant montage) : image ∞ directe, pas d'aiguille, pas de
  pastille compteur, pas de son joué.
- Non-régression : parcours d'achat existant (drapeau, toasts) intact.

## Hors périmètre

- Aucun changement GameContext, header, réglages, i18n (clés existantes suffisent).
- Pas d'événement à la restauration ni au boot.
- Pas de changement du plugin natif ni des pages légales.
