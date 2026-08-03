# Audit complet — Projet Broc (v1.2.0)

**Date :** 2026-08-03 · **Mode :** lecture seule (aucun fichier source modifié)
**Périmètre :** architecture, performances (mémoire/rendu/I-O), sécurité des données, expérience utilisateur (fluidité, états)
**Stack auditée :** Next.js 16 (export statique) + React 19 + Tailwind 4, embarqué Tauri 2 / WKWebView iOS, sauvegarde localStorage multi-slots, i18n FR-EN-ES-EL, 310 fichiers source / 166 fichiers de tests.

---

## Synthèse exécutive

L'état général est **nettement au-dessus de la moyenne** pour un projet de cette taille : chaîne de persistance remarquablement robuste (double-buffer, flush synchrone `pagehide`, garde de slot), hygiène TypeScript irréprochable (zéro `any`, zéro `TODO`, zéro `@ts-ignore` dans `src`), séparation des couches respectée, collecte de données minimale et fidèlement documentée. Aucun vecteur de perte de progression n'a été trouvé dans la chaîne de sauvegarde elle-même.

Les vrais risques identifiés sont ailleurs :

1. **Deux bugs de gameplay à perte d'argent réelle et persistée** (achat non atomique au chinage, double débit à l'entrée en brocante) — les seuls défauts qui lèsent directement le joueur.
2. **Un risque mémoire iOS unique mais sérieux** : le cache d'`AudioBuffer` sans éviction peut retenir ~110-130 Mo de PCM décodé à vie dans la WKWebView.
3. **Une dette structurelle concentrée** : `GameContext.tsx` (2048 l, ~55 actions) et la page de vente (1429 l, cœur de la boucle de gameplay, zéro test) sont les deux points de passage de toute évolution future.

---

## 🔴 Priorité HAUTE

### H1. Achat au chinage non atomique — argent débité, objet perdu *(confirmé sur le code)*

- `src/context/GameContext.tsx:704-710` : `ajouterObjet` fait `if (stockageEstPlein(prev)) return prev;` — **no-op silencieux**, sans valeur de retour.
- `src/app/chiner/[brocanteId]/ClientPage.tsx:326-338` : `handleAchatAuPrix` vérifie le budget, puis appelle `ajusterBudget(-prix)` **puis** `ajouterObjet(...)` — deux `setState` indépendants. Stockage plein ⇒ argent débité, objet absent, la fonction renvoie quand même `true` (XP créditée, tampon « acquis » affiché).
- Chemin UI non gardé : dans `src/components/mobile/chine/ChineNegoDrawer.tsx`, la garde `plein` ne couvre que la vue repliée ; `handleProposer` (l.87-96) et le refus poli (l.161-168) concluent la négo sans vérifier `plein`.

**Reco :** une action atomique `acheterObjet(objet, prix)` dans le GameContext qui vérifie budget **et** stockage dans le même updater et renvoie `{ok, raison}` ; ajouter `plein` à la garde du tiroir déplié.

### H2. Double débit possible à l'entrée en brocante + aucun verrou anti double-tap

- `src/components/mobile/brocante-pano/BrocantePanorama.tsx:224-241` : `onContinuer` débite `ajusterBudget(-fraisEntree)` + `consommerEnergie(1)` **avant** `router.push`, sans ref d'idempotence — un double-tap rejoue le débit.
- `src/components/mobile/TabBar.tsx:210-221` et `SwipePager.tsx:155-159` : `router.push` sans verrou pendant l'animation (280 ms). Contre-exemple correct : l'écran titre verrouille sur l'iris (`src/app/page.tsx:263`), mais pas `onNouvellePartie` (l.250-260).

**Reco :** ref `dejaPayeRef` dans `onContinuer` ; verrou de navigation léger dans TabBar/SwipePager.

### H3. Cache d'AudioBuffer sans éviction — jusqu'à ~110-130 Mo de PCM retenus à vie *(confirmé sur le code)*

- `src/lib/audio/audioManager.ts:80,163-176` : `Map<string, AudioBuffer>` sans aucun `delete`/`clear` dans les 1188 lignes. `decodeAudioData` produit du PCM Float32 stéréo (~350-380 Ko/s) quel que soit le poids du mp3.
- Boucles longues décodées : `ambience-qg.mp3` 107,5 s ≈ 40 Mo, `vinyl-noise-loop.mp3` ≈ 26 Mo, `depart-voiture.mp3` ≈ 23 Mo **+ copie inversée** cachée sous `#inverse` (`:673-697`) ≈ 46 Mo pour le garage seul.
- Contexte : WKWebView iOS soumise au jetsam ; le projet a déjà connu un kill mémoire WebView (cf. commentaire `prefetchThumbs.ts:24-26`).

**Reco :** streamer les boucles longues via `HTMLAudioElement` + `createMediaElementSource` (chemin déjà existant pour les vinyles, `playVinyl:918-948`) ; a minima évincer `depart-voiture` + copie inversée après lecture, et raccourcir les boucles sources (107 s → 30-40 s : gain mémoire ET bundle).

### H4. Le seul avertissement de perte de données est en français en dur

- `src/context/GameContext.tsx:330,335` : toasts « Sauvegarde impossible — stockage plein… » / « Sauvegarde rétablie. » en littéraux FR, alors que `raisonLocalisee()` (l.141-146) existe dans le même fichier. Le jeu est vendu en 4 langues : un joueur EN/ES/EL reçoit l'unique alerte de risque de perte de progression dans une langue qu'il ne lit pas.

**Reco :** passer ces deux messages par le dictionnaire. Correctif trivial, impact direct.

### H5. `GameContext.tsx` : monolithe de 2048 lignes, ~55 actions, 8 sous-systèmes

- Interface `GameActionsValue` (l.158-269) : ~55 actions couvrant 10 domaines. Le provider héberge en plus auto-save, ancre de temps réseau, et 4 familles de notifications.
- ~120 lignes de liturgie dupliquée (objet l.1883-1941 + deps l.1942-2000) : chaque action nouvelle = 4 éditions.
- Logique métier résiduelle en dur : mécanique du chat (proba 0,5, pity 3) dans `avancerJour` (l.734-749), refresh hebdo (l.755-778).
- À préserver : le double contexte état/actions (l.276-277) et les 3 hooks (`useGame`/`useGameActions`/`useGameStateOnly`) — vrai amortisseur de re-renders.

**Reco :** extraire des fabriques d'actions par domaine (`creerActionsVitrine(...)`, etc.) assemblées par spread, sans toucher au contrat des 3 hooks ; déplacer chat/refresh hebdo vers `src/lib` (testables). Cible : fichier sous ~600 l sans changement d'API.

### H6. La boucle de gameplay de vente (1429 l) n'a aucun test

- `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx` : machine de session (tick 100 ms, spawn clients, criée, célébrité), gel XP/budget, 3 gardes de fin de journée coordonnées par refs, tutoriel — **0 test** ; idem `chiner/[brocanteId]/ClientPage.tsx` (596 l).
- Les deux régressions device passées n'y sont documentées que par commentaires-sentinelles (l.427, l.647), et `exhaustive-deps` désactivé y a déjà laissé dériver les dépendances (`terminerJournee` l.481-489 liste `journeeFinie` qu'il ne lit pas).

**Reco :** extraire la machine de session en logique pure (`reduce(sessionState, event)` dans `src/lib/vitrine/`) testable en vitest sans DOM ; convertir les commentaires-sentinelles en cas de test.

---

## 🟠 Priorité MOYENNE

### M1. CSP désactivée dans la webview *(convergence de 2 analyses indépendantes)*
`src-tauri/tauri.conf.json` : `"security": { "csp": null }`. Aucun vecteur XSS identifié aujourd'hui (contenu 100 % local, React échappe, unique `dangerouslySetInnerHTML` statique dans `layout.tsx:77-82`), mais zéro défense en profondeur dans une webview ayant accès aux commandes natives. **Reco :** `default-src 'self'; img-src 'self' data:; media-src 'self'; connect-src 'self' https://timeapi.io; style-src 'self' 'unsafe-inline'` + hash/nonce pour le script inline ; valider sur simulateur (attention `data:`/`blob:` audio).

### M2. Saves chargées sans validation structurelle
`src/lib/storage/localGameRepository.ts:16-23` : `JSON.parse(raw) as GameState` — simple cast. Une save corrompue-mais-parsable traverse les migrations (le filet `assurerFiletSecuriteMinimal` ne re-type que 3 champs) → NaN propagés, crashs différés (piège déjà rencontré sur ce projet). Note : `remapTemplateIds` (`migrations.ts:64-77`) copie via `out[k] = v` sans filtrer `__proto__`/`constructor`. **Reco :** coercition `Number.isFinite` + clamp des champs numériques critiques (budget, énergie, xp, jour) en fin de `migrerSauvegarde` ; filtrer les clés dangereuses.

### M3. Consentement publicitaire UMP non retirable dans l'app
`src-tauri/gen/apple/Sources/app/AdmobBridge.swift:128-149` : `loadAndPresentIfRequired` une seule fois au boot ; aucun `presentPrivacyOptionsForm` nulle part. La page privacy assume (« supprimez puis réinstallez ») — ce qui ne satisfait ni la politique Google UMP (point d'entrée permanent requis pour l'EEA) ni le RGPD (retrait aussi simple que l'octroi). **Reco :** bouton « Options de confidentialité des publicités » dans Réglages, affiché quand UMP le requiert.

### M4. Migrations en passe monolithique rejouée à chaque chargement
`src/lib/migrations.ts:273-829` : fonction unique de 556 l rejouant v1→v17 avec gates ad hoc croisés (`dejaV9/V13/V15`, l.513-815) ; le commentaire l.568-571 décrit lui-même un bug frôlé. Robustesse actuelle réelle (90 tests comportementaux, anti-downgrade, fail-open sans re-tamponnage), mais chaque version accroît le produit cartésien des interactions. **Reco :** chaîne de pas versionnés `MIGRATIONS: Record<number, (s) => s>` appliqués de `loaded.version` à `SAVE_VERSION` — gates par construction — sous le harnais des 90 tests existants. Aussi : `migrerEnRestauration` (l.128-136) ne valide pas `etatCible` (`String(e.etatCible)` peut produire `"undefined"`).

### M5. Course start/stop des 5 boucles d'ambiance audio
`src/lib/audio/audioManager.ts:769` (`startAmbience`) et sœurs (`:699,:734,:804,:1006`) : la garde `if (this.ambienceSource) return;` est posée **avant** l'`await` du décodage ; un `stopAmbience()` pendant le décodage est un no-op, puis la source démarre et boucle hors de toute pièce (démontage rapide / double montage StrictMode) ; deux appels concurrents ⇒ double boucle. **Reco :** jeton posé avant l'`await` (ou stocker la promesse) + re-check post-décodage avant `src.start()`.

### M6. Actions du contexte à échec silencieux — patron `{ok, raison}` non uniforme
- `acheterCamion` (`GameContext.tsx:1106-1123`) : no-op muet ; appelé en différé en pleine cérémonie (`CoffreChargement.tsx:292`) avec bandeau « véhicule acquis » affiché **inconditionnellement** — cérémonie de succès possible sans achat réel.
- `ajusterBudget` (l.723-725) : aucune garde contre le négatif, protection déléguée à chaque appelant.
- Échecs muets après action explicite : livraison de commande (`OngletCommandes.tsx:252-253`, `res.raison` localisée jetée), `acheterGazette`/rerolls (`(qg)/layout.tsx:836-851`), **pub regardée pour rien** sans message si `terminerRestaurationImmediate` échoue (`atelier/page.tsx:105`), redirection budget sans toast + `?raison=budget` jamais lu (`chiner/ClientPage.tsx:167`).

**Reco :** généraliser `{ok, raison}` (déjà majoritaire) et afficher `raison` en toast.

### M7. Re-renders : 27 fichiers consomment l'état complet via `useGame()` sans sélecteurs
`GameContext.tsx:1875-1878` : `stateValue = { state, isHydrated }` change d'identité à chaque mutation → tout consommateur re-rend, dont `QgLayoutInner` (835 l, panorama) avec `useMemo` sur `[state]`. Bien amorti aujourd'hui (ticks no-op via `settleEnergie` retournant `prev`, actions stables), mais c'est le multiplicateur de tout coût futur. **Reco :** basculer les consommateurs à 1-2 champs vers `useGameStateOnly`/dérivations fines ; si un profil device le justifie, trancher le contexte d'état.

### M8. Accessibilité — quatre chantiers
- **Focus/modales :** zéro `.focus()` dans `src/components`+`src/app`, aucun `inert` — les 23 `aria-modal` n'isolent pas le focus ; `ObjetDetailOverlay.tsx:134-140` et `CollectionDetailOverlay.tsx:133-140` ne se ferment **que** par tap backdrop (inutilisables en VoiceOver) ; 15/23 dialogues sans `Escape` ; bouton « passer » du bilan en `aria-hidden` (`BilanSession.tsx:381-385`).
- **Cibles < 44 px :** croix `BoiteMystereOverlay.tsx:154-168` (~20 px), `PersonaInfoOverlay.tsx:189-197` (~19 px), bouton info `PersonaAvatar.tsx:132-137` (26 px), etc. — le token `--tap-min` (`globals.css:860`) n'est utilisé que dans 6 fichiers.
- **Libellés :** interrupteurs son/musique sans nom accessible (`ReglagesModal.tsx:155`), `div` cliquables sans rôle (`StockageItemRow.tsx:128`…), `aria-label={`État : ${etat}`}` FR en dur + valeur brute (`ItemCard.tsx:94`, `FrameItem.tsx:372`).
- **`prefers-reduced-motion` :** respecté en CSS et dans 4 composants, mais ignoré par `flyToTab` (`src/lib/flyAnimation.ts:31-90`, moteur de **toutes** les cérémonies d'envol), la cérémonie de livraison, les envols atelier et les tweens du coffre. **Reco :** un garde unique dans `flyToTab` couvre l'essentiel.

### M9. i18n — fuites résiduelles et risque grec
- Chaînes dures : toasts de save (cf. H4), « Carnet mondain » (`GazetteSheet.tsx:387`), `État : …` (cf. M8) ; `RareteBadge`/`EtatBadge` FR en dur mais non importés (code mort à supprimer).
- `white-space: nowrap` sans ellipsis sur textes traduits alors que le dictionnaire grec est le plus long (42 Ko vs 31 Ko FR) : `PageHeaderBar.tsx:45` (titres de toutes les pages), boutons du menu (`page.tsx:66`, largeur fixe 210 px), FAB du QG, chips, tampons… Contre-exemple à imiter : `LevelUpOverlay.tsx:153-162` calibre sur « Επίπεδο 100 ». **Reco :** passe visuelle grec sur ~8 fichiers.

### M10. Feedback & états intermédiaires
- Boutons grisés sans raison : « Débloquer » bibliothèque (`bibliotheque/page.tsx:707`, ni coût ni solde), branche `tropCher` de la négo (`ChineNegoDrawer.tsx:54-55`), `!peutEntrer` signalé uniquement par la couleur et sans dire si c'est le budget ou l'énergie (`BrocanteDetailFloating.tsx:113-121`).
- Latence pub atelier sans indicateur : l'overlay portant l'état est démonté **avant** la résolution de `showRewardedAd()` (`atelier/page.tsx:846-849`) — écran inerte pendant l'init UMP/ATT. `EnergieRecharge` et `BoiteMystereOverlay` font correctement l'inverse.
- Incohérences de chargement : `/vitrine` rend `null` pendant l'hydratation (`vitrine/page.tsx:32`) là où `/chiner` a un `SkeletonScreen` ; écran d'attente du QG sur fond crème alors que le QG est vert forêt (flash clair→sombre, `(qg)/layout.tsx:454-469`) ; aucun `loading.tsx` dans `src/app`.
- Save illisible : restaurée depuis backup sinon traitée comme absente (`localGameRepository.ts:49-52`) — pas de crash, mais **aucun message** au joueur (« Continuer » simplement grisé). **Reco :** flag posé à l'échec de parse, message unique sur l'écran titre.

### M11. Outillage — script `lint` mort et `exhaustive-deps` off
- `package.json:10` : `"lint": "next lint"` — commande supprimée de Next 16 ; le vrai filet est `lint:hooks`. Une CI ou un contributeur échoue pour une mauvaise raison. **Reco :** `"lint": "eslint src"`.
- `eslint.config.mjs` : une seule règle active (`rules-of-hooks`) ; `exhaustive-deps` off — la dérive de deps de H6 en est la conséquence mesurable. **Reco :** passer `exhaustive-deps` en `warn`.

### M12. `(qg)/layout.tsx` (957 l) non testé + duplication des animations d'envol
- `QgLayoutInner` : 15 `useState`, audio gramophone, verrou scroll iOS, délivrance de chapitres (3 effets + 2 états intermédiaires) ; un crash React #310 y a déjà eu lieu (commentaire l.383-387) ; 0 test. **Reco :** extraire `useGramophone` et `useDelivranceChapitre` testables via `renderHook`.
- `atelier/page.tsx:181-225,255-298` réimplémente deux fois inline ce que `src/lib/flyAnimation.ts` (`flyToTab`, utilisé par 4 composants) fournit déjà — 3 copies du même savoir-faire. Duplication cousine : trio gel XP/budget copié entre les deux ClientPage (piège StrictMode dupliqué). **Reco :** généraliser `flyToTab` ; hook `useGelAffichageSession`.

---

## 🟢 Priorité BASSE

| # | Constat | Localisation | Reco |
|---|---------|--------------|------|
| B1 | Pub initialisée sans vérifier `canRequestAds` après échec UMP hors-ligne | `AdmobBridge.swift:32-45,131-136` | Conditionner `start()`/préchargement à `canRequestAds` |
| B2 | Clé Gemini dans l'historique git public (révoquée par Google) | commit 2f06d01, vidée par 7bc55bd | Vérifier que la clé actuelle est nouvelle + restreinte ; pas de réécriture d'historique nécessaire |
| B3 | Vrai cycle d'imports runtime notifications | `notifications/prefs.ts:6` ↔ `index.ts` | Déplacer `annuler` ou injecter ; 4 autres cycles sont type-only (bénins) |
| B4 | Version 1.2.0 dupliquée dans 6 fichiers, synchronisée à la main | package.json, tauri.conf.json, Cargo.toml(+lock), project.yml, Info.plist | Script `bump-version.mjs` |
| B5 | Ticker 1 Hz inconditionnel re-rendant toute la page atelier (même sans restauration en cours) | `atelier/page.tsx:91-95` | `return` avant `setInterval` si aucune restauration active |
| B6 | Transitions sur propriétés de layout ; le pire : barre de temps de vente en `transition: width 1s linear` relancée chaque seconde (layout continu toute la session) | `journee/ClientPage.tsx:1284` ; aussi `NegoBar.tsx:96`, `HumeurGauge.tsx:104`, dots panorama | `transform: scaleX()` + `transform-origin: left` pour la barre de temps |
| B7 | Poids embarqué 134 Mo (`items/` 53 Mo, `sounds/` 50 Mo dont vinyles 42 Mo) — arbitrage déjà validé pré-soumission | `out/`, `public/` | Seule piste : raccourcir les boucles d'ambiance (sert aussi H3) |
| B8 | `global-error.tsx` figé `lang="fr"`, hors `LangueProvider`, fontes non chargées | `global-error.tsx:14` | Localiser si effort faible ; filet fonctionnel sinon |
| B9 | Code mort assumé | `migrations.ts:98-101` (`void donnerObjetFn`), `RareteBadge`/`EtatBadge` non importés | Supprimer |
| B10 | Index de slots corrompu ⇒ retombée silencieuse sur le slot 1 (saves intactes mais « invisibles ») | `slots.ts:173-185` | UI de récupération (résidu connu et tracé) |
| B11 | `noUncheckedIndexedAccess` absent malgré beaucoup d'indexations | tsconfig.json | Optionnel, coût d'activation non trivial |

---

## ✅ Points sains à préserver (vérifiés)

- **Persistance exemplaire** : debounce 400 ms + flush synchrone `pagehide`/`visibilitychange`, un seul `stringify` réutilisé pour les deux écritures backup+principal, restauration depuis la copie si le principal est tronqué, garde de slot (`slotEtatRef`), quota plein signalé par toast, migration legacy paranoïaque (copie→relecture→comparaison→suppression).
- **Hygiène du code** : zéro `TODO/FIXME/any/@ts-ignore` dans `src` ; aucune inversion de couches (`lib` n'importe jamais `components`/`context`) ; `strict: true`.
- **Performance déjà travaillée** : tick de vente 100 ms entièrement sur refs (1 re-render/s max), séparation contexte état/actions avec ticks no-op, `CollectionGrid` virtualisée (overscan 8, cellules `memo`), `loading="lazy"`+`decoding="async"` par défaut, listeners équilibrés partout.
- **Vie privée** : collecte minimale (aucun compte/analytics), page privacy en 4 langues **fidèle au code** (timeapi.io et AdMob décrits, IP mentionnée), ordre UMP→ATT correct, permissions Tauri minimales (pas de fs/shell/http), pas d'exception ATS.
- **Tests** : `src/lib` et `src/data` quasi exhaustifs, tests comportementaux qui rejouent les régressions réelles (ex. scénario d'écrasement de slot) — pas de tests creux détectés.
- **UX** : transition iris complète (verrou d'interaction, voile pré-hydratation, préchargement, repli reduced-motion) ; error boundaries présents avec réinitialisation limitée au slot actif et double confirmation.

---

## Ordre d'attaque suggéré

1. **Quick wins à fort impact joueur** (une séance) : H4 (toasts localisés), garde `plein` du tiroir de négo (moitié de H1), `dejaPayeRef` (H2), M11 (`lint`).
2. **Correctifs de fond gameplay** : H1 complet (`acheterObjet` atomique), M6 (patron `{ok, raison}` uniforme).
3. **Mémoire iOS** : H3 (éviction/streaming audio) — le seul risque de crash système identifié.
4. **Dette structurelle, au fil de l'eau** : H5 (fabriques d'actions), H6 (machine de session extraite + tests), M4 (migrations en pas versionnés) — chacun sous harnais de tests existant.
5. **Conformité & polish** : M3 (UMP), M1 (CSP), M8 (a11y), M9 (grec).

---

*Audit réalisé par 4 analyses parallèles indépendantes (architecture/dette, performances, sécurité/données, UX/états), constats croisés puis contre-vérifiés sur le code pour les points critiques (H1 et H3 confirmés ligne à ligne). Aucun test ni build exécuté ; aucun fichier source modifié.*
