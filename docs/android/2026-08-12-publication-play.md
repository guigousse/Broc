# Publication Play Store — recette Play Console et testeurs

Livrable non-code de la Task 5 du sous-projet D (`docs/superpowers/specs/2026-08-12-android-publication-design.md`).
Suit l'ordre réel des écrans de Play Console au 2026-08-12 — cet ordre change souvent
d'une version de l'interface à l'autre, corriger ce document si l'écran a bougé.

Pré-requis : un AAB signé produit par `.github/workflows/android-play.yml` (Task 3/4),
vérifié par `bundletool` + `apksigner` (spec § 9).

## Outillage : comment lancer la CI depuis cette branche

GitHub n'affiche l'onglet **Run workflow** pour `workflow_dispatch` que si le fichier de
workflow existe déjà sur la **branche par défaut** (`main`). Or `feat/android-socle`
n'est pas encore fusionnée, et `main` ne contient que `ios-testflight.yml` : sans rien de
plus, Guillaume pousserait la branche et ne verrait aucun bouton pour lancer la build.

Deux options existaient ; celle retenue pour ce lot est la première :

1. **(retenu) Déclencheur `push` temporaire**, restreint à `feat/android-socle` et aux
   chemins qui comptent (`src-tauri/**`, `src/**`, `package.json`,
   `package-lock.json`, le workflow lui-même), ajouté dans `android-play.yml` en plus de
   `workflow_dispatch`. Le premier push de la branche déclenche donc la build tout seul.
   À retirer du fichier dès que la branche est fusionnée sur `main` — `workflow_dispatch`
   suffira alors, comme pour `ios-testflight.yml`.
2. **(écarté pour ce lot)** Fusionner `feat/android-socle` sur `main` avant de toucher à
   Play Console. Plus propre, mais retarderait le premier dépôt — et donc les 14 jours —
   le temps de finir la fusion du sous-projet A.

## Rappel : pourquoi une piste fermée et pas interne

Le compte Play Console de Guillaume est **personnel et créé après le 13 novembre 2023**.
Google exige **12 testeurs inscrits en continu pendant 14 jours** avant d'ouvrir l'accès à
la production (seuil abaissé de 20 à 12 le 11 décembre 2024, vérifié le 2026-08-12). Ce
compteur **ne se déclenche que sur une piste de test fermé** — une piste interne ne compte
pas. D'où le point 9 ci-dessous : fermé, pas interne.

## Les dix points

### 1. Créer l'application

- **Nom : `Broc : Jeu de Brocante`** — Play n'a qu'**un seul** champ « nom de
  l'application » (30 caractères) : celui saisi ici est le même que celui affiché dans
  la fiche magasin (point 3). Utiliser directement le nom définitif, aligné sur la fiche
  App Store (`FICHE_APP_STORE.md`), pour ne pas avoir à le corriger après coup. `BROC`
  seul n'est qu'un raccourci utilisé dans ce document et ailleurs (icône, marketing) —
  pas la valeur à saisir dans ce champ.
- Langue par défaut : français
- Type : Jeu
- Gratuit
- Package : `com.guigousse.broc` (celui du manifeste, confirmé dans
  `src-tauri/gen/android/app/build.gradle.kts`)

### 2. Play App Signing

Adhérer (obligatoire pour toute nouvelle application). Laisser Google générer la clé de
**signature** — celle qui signe ce que les joueurs installent. Ne pas la confondre avec la
clé d'**upload** (`broc-upload`, Task 1) : Google déduit le certificat d'upload du premier
AAB déposé, à l'étape 10 ci-dessous. Rien à téléverser manuellement à ce stade.

### 3. Fiche minimale — FR et EN seulement

Repris tel quel de `docs/appstore/FICHE_APP_STORE.md`. Un test fermé n'exige pas une fiche
léchée en quatre langues — ES et EL viendront avec la fiche complète, hors périmètre D.

**Description courte (80 caractères max — champ propre à Play, n'existe pas côté
App Store).** Rédigée pour ce lot, dans le ton de la fiche existante :

| Langue | Texte | Longueur |
|---|---|---|
| FR | `Chinez, négociez, restaurez : dénichez les trésors oubliés de la brocante.` | 74/80 |
| EN | `Hunt, haggle, restore: uncover the treasures everyone else walked past.` | 71/80 |

**Description longue** : coller telle quelle la section « Description » de
`FICHE_APP_STORE.md`, français (lignes 25-48) puis anglais (lignes 74-97). Ne pas
retoucher le texte — il est déjà vérifié en longueur pour l'App Store, et Play tolère
jusqu'à 4000 caractères, largement au-dessus des ~1300-1500 utilisés.

**Nom de l'application.** C'est le **même champ** qu'au point 1 (Play n'en a qu'un) : déjà
réglé sur `Broc : Jeu de Brocante` à la création. Rien à refaire ici en français. En
anglais, le champ est traduit séparément par langue : `Broc: Flea Market Game` (ligne 59
de la fiche). Ne pas confondre avec un « nom d'app » et un « titre de fiche » distincts —
il n'y en a qu'un.

### 4. Éléments graphiques

- **Icône** : 512×512, `public/icon-512.png` — déjà à la bonne taille, aucun
  rééchantillonnage nécessaire.
- **Image de couverture (feature graphic)** : 1024×500 — ✅ **produite**,
  `marketing/play/feature-graphic-1024x500.png` (façade du menu, titre en Verve Shadow,
  1024×500 exactement, sans canal alpha). Régénérable par
  `node scripts/play/generate-feature-graphic.mjs`. C'était un **prérequis bloquant** :
  Play l'exige pour publier la fiche, donc la piste, donc pour démarrer les 14 jours.
  La bannière Facebook 820×360 n'était pas réutilisable — ratio ≈2,28:1 contre 2,048:1.
- **Captures téléphone, au moins deux** : ✅ **produites**, `marketing/play/captures/`
  (5 fichiers `01-chiner` … `05-musiques`, 1242×2484, sans alpha). Régénérables par
  `node scripts/play/preparer-captures.mjs`. Elles sont **rognées** et non
  redimensionnées : les captures App Store font 1242×2688, soit un ratio ≈1:2,16, alors
  que Play plafonne strictement à **2:1** — au-delà, l'upload est refusé, et un
  redimensionnement aurait déformé le jeu. 102 px ont été retirés en haut et en bas, ce
  qui laisse le HUD et la barre d'onglets intacts. Play les trie par ordre alphabétique,
  d'où le préfixe numérique. Les captures Android définitives (émulateur ou appareil)
  restent à faire plus tard, hors périmètre D.

### 5. Politique de confidentialité

URL déjà en ligne depuis le lancement iOS : `https://project-5yn6d.vercel.app/privacy`
(`FICHE_APP_STORE.md` ligne 207). Si le projet Vercel a été renommé depuis, corriger
partout avant de coller l'URL ici — Google visite la page, comme Apple.

### 6. Classification de contenu et public cible

Questionnaire standard (IARC). Rien de spécifique au jeu ne justifie une classification
au-delà de « Tous publics » — cohérent avec le 4+ retenu côté App Store
(`FICHE_APP_STORE.md` ligne 205). Pas de violence, pas d'achat intégré actif sur Android
à ce jour (sous-projet C non livré), pas de contenu utilisateur.

### 7. Data safety — ⚠️ déclaration à refaire à l'arrivée de B

**Déclarer l'état d'aujourd'hui : aucune collecte de données.** Sur Android, à la date de
ce dépôt, les publicités et l'achat sont **explicitement indisponibles** (sous-projet A,
`docs/android/2026-08-12-recette-emulateur.md`, points 5-6-7) : aucun SDK publicitaire
n'est actif, rien n'est envoyé à un tiers.

**Cette déclaration est fausse dès que le sous-projet B (AdMob Android) atterrit** : AdMob
collecte l'identifiant publicitaire (`AD_ID`) et des données d'usage à fin publicitaire —
exactement ce que la fiche App Store déclare déjà côté iOS (`FICHE_APP_STORE.md` ligne
209). **Une déclaration Data safety fausse est un motif de suspension du compte
développeur.** Ne pas déployer B sans revenir sur cet écran le jour même.

### 8. Publicités — ⚠️ déclaration à refaire à l'arrivée de B

Déclarer **« Cette application ne contient pas de publicités »**. Vrai aujourd'hui, faux
dès B. Même avertissement qu'au point 7 : à rectifier le jour où AdMob est intégré, pas
après.

### 9. Piste de test fermé

Créer une piste de **test fermé** (`Testing → Closed testing`), pas interne — l'interne ne
déclenche pas le compteur des 14 jours (spec § 5). Y rattacher un **groupe Google** dédié
(pas une liste d'e-mails saisie à la main dans la console) : voir « Testeurs » ci-dessous
pour ce que ce groupe doit contenir.

### 10. Déposer l'AAB et publier

Téléverser l'AAB produit par le workflow (artefact `broc-aab` du run manuel de
`android-play.yml`). Publier la version sur la piste de test fermé. Play calcule alors le
lien d'inscription (`Testers → join on the web` ou lien direct `…/apps/testing/...`) — le
relever et le reporter dans « Résultats » ci-dessous.

**⚠️ `GITHUB_RUN_NUMBER` est propre au fichier de workflow, pas au dépôt.** Le
`versionCode` calculé en CI vaut `1002000 + GITHUB_RUN_NUMBER`, et ce numéro de run
repart de 1 si le fichier `android-play.yml` est **renommé ou recréé** (GitHub le traite
alors comme un workflow différent). Renommer ce fichier après un premier dépôt referait
donc calculer un `versionCode` déjà utilisé — Play refuse un dépôt qui n'est pas
strictement croissant. Ne pas renommer/recréer `android-play.yml` une fois le premier AAB
déposé ; si c'est inévitable, relever manuellement le point de départ (`1002000 + …`)
au-dessus du dernier `versionCode` déposé.

**Corollaire, dès le tout premier run** : `versionCode` dépasse déjà `1002000` (le
`versionCode` local de la 1.2.0, lu dans `tauri.properties`) dès le run n°1 de la CI.
**Aucune build locale de la version 1.2.0 ne pourra plus être déposée** sur cette piste
une fois la CI passée : toute build future destinée à Play doit venir de la CI (dont le
compteur ne fait qu'augmenter), ou d'un `versionCode` local relevé à la main au-delà du
dernier déposé.

---

## Testeurs — mode d'emploi

### Message type à copier-coller

> Salut ! Je sors un jeu de brocante sur Android et j'ai besoin de testeurs.
>
> 1. Accepte l'invitation ici : `<lien d'inscription>`
> 2. Installe BROC depuis le Play Store (le lien te redirige)
> 3. **Reste inscrit 14 jours, sans quitter le programme de test.** Google compte les
>    testeurs inscrits en continu sur cette période ; le mieux est de garder le jeu
>    installé tout du long, donc évite de le désinstaller.
>
> Joue quand tu veux, même cinq minutes. Si tu vois un bug, écris-moi.

**Précision technique (pas à mettre dans le message) :** le compteur porte sur
l'**inscription** au programme de test (l'opt-in), en continu — pas sur l'installation de
l'app. Désinstaller le jeu ne désinscrit pas quelqu'un du programme. La consigne de ne
pas désinstaller reste utile (pour de vrais retours, et parce qu'un testeur qui
désinstalle a plus de chances de décrocher aussi du programme), mais ce n'est pas une
règle imposée par Google — ne pas la présenter comme telle aux testeurs.

### Consigne d'exploitation du groupe Google

- Héberger toutes les adresses (prestataire compris) dans un **groupe Google** rattaché à
  la piste, jamais saisies une par une dans Play Console : un remplacement se fait alors
  en ajoutant/retirant un membre du groupe, la console suit sans latence supplémentaire.
- **Mêler au moins deux testeurs réels** (Guillaume et un proche) aux adresses fournies
  par le prestataire — retours exploitables, profil moins uniforme. Le recours au service
  payant est une décision prise et assumée, ce document ne la remet pas en cause ; ce qui
  suit est l'atténuation convenue.
- **Garder deux ou trois adresses de réserve**, non inscrites au départ. Sur quatorze
  jours consécutifs, il faut s'attendre à devoir remplacer un ou deux testeurs qui
  décrochent — chaque remplacement recule la date d'éligibilité s'il fait tomber le compte
  sous 12 pendant ne serait-ce qu'un jour.

---

## Résultats — à compléter par Guillaume

*(Step 4-5 du plan : exécution dans Play Console, hors de portée de l'agent. Champs
laissés vides intentionnellement.)*

| Élément | Valeur |
|---|---|
| Date de dépôt du premier AAB | `______________` |
| `versionCode` réellement déposé | `______________` |
| Taille de l'AAB (relevée Task 4, Step 7) | `______________` |
| Lien d'inscription à la piste de test fermé | `______________` |
| Nombre de testeurs inscrits | `______________` / 12 |
| Date du 12ᵉ inscrit | `______________` |
| **Date d'éligibilité (12ᵉ inscrit + 14 jours), en toutes lettres** | `______________` |

Écarts constatés entre cette recette et l'interface réelle (à noter au passage, Play
Console change souvent) :

`______________`

---

## À reprendre pour B et C

**Sous-projet B (AdMob Android)**, le jour même de son atterrissage :
- Data safety (point 7 ci-dessus) : déclarer la collecte de l'identifiant publicitaire et
  des données d'usage publicitaire.
- Déclaration « contient des publicités » (point 8) : passer à oui.
- Permission `AD_ID` dans le manifeste : vérifier qu'elle est bien déclarée côté Gradle
  (Play la détecte automatiquement via la dépendance AdMob, mais la déclaration Data
  safety doit être cohérente avec elle).

**Sous-projet C (achat « énergie infinie »)** :
- Créer le produit d'achat intégré dans Play Console — **impossible avant ce premier
  dépôt**, c'est précisément ce que ce dépôt débloque (spec § 1).
- Revoir la Data safety une seconde fois : l'achat en tant que tel ne collecte pas de
  donnée personnelle nouvelle, mais la case « achats intégrés » de la fiche doit passer à
  oui.
