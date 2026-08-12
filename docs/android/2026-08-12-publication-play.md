# Publication Play Store — recette Play Console et testeurs

Livrable non-code de la Task 5 du sous-projet D (`docs/superpowers/specs/2026-08-12-android-publication-design.md`).
Suit l'ordre réel des écrans de Play Console au 2026-08-12 — cet ordre change souvent
d'une version de l'interface à l'autre, corriger ce document si l'écran a bougé.

Pré-requis : un AAB signé produit par `.github/workflows/android-play.yml` (Task 3/4),
vérifié par `bundletool` + `apksigner` (spec § 9).

## Rappel : pourquoi une piste fermée et pas interne

Le compte Play Console de Guillaume est **personnel et créé après le 13 novembre 2023**.
Google exige **12 testeurs inscrits en continu pendant 14 jours** avant d'ouvrir l'accès à
la production (seuil abaissé de 20 à 12 le 11 décembre 2024, vérifié le 2026-08-12). Ce
compteur **ne se déclenche que sur une piste de test fermé** — une piste interne ne compte
pas. D'où le point 9 ci-dessous : fermé, pas interne.

## Les dix points

### 1. Créer l'application

- Nom : `BROC`
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

**Nom de l'application** dans la fiche magasin (distinct du nom de l'app, point 1) :
`Broc : Jeu de Brocante` (FR) / `Broc: Flea Market Game` (EN), lignes 10 et 59 de la
fiche.

### 4. Éléments graphiques

- **Icône** : 512×512, `public/icon-512.png` — déjà à la bonne taille, aucun
  rééchantillonnage nécessaire.
- **Image de couverture (feature graphic)** : 1024×500. **N'existe pas encore** — aucun
  fichier de ce format dans le dépôt à ce jour. À produire avant cet écran (hors
  périmètre de cette tâche) ; la bannière Facebook 820×360 (`marketing/facebook/`) n'est
  pas réutilisable telle quelle, le ratio diffère.
- **Captures téléphone, au moins deux** : rééchantillonner depuis
  `marketing/appstore/.captures/fr-iphone-6.5-*.png` (ou `en-iphone-6.5-*.png`).
  **Piège de ratio, pas seulement de résolution** : ces captures pèsent 1242×2688, soit un
  ratio ≈ 1:2,16. Play plafonne strictement le ratio à **2:1** (`max(côté) ≤ 2 ×
  min(côté)`) — au-delà, l'upload est refusé. Il faut donc **rogner**, pas seulement
  redimensionner (par exemple recadrer à 1242×2484, ratio exactement 1:2). Format accepté :
  JPEG ou PNG 24 bits **sans canal alpha**, 320 à 3840 px par côté. Deux suffisent pour un
  test fermé ; les captures Android définitives (émulateur ou device) restent à faire
  plus tard, hors périmètre D.

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

---

## Testeurs — mode d'emploi

### Message type à copier-coller

> Salut ! Je sors un jeu de brocante sur Android et j'ai besoin de testeurs.
>
> 1. Accepte l'invitation ici : `<lien d'inscription>`
> 2. Installe BROC depuis le Play Store (le lien te redirige)
> 3. **Surtout : ne désinstalle pas le jeu pendant 14 jours.** Google compte les
>    testeurs inscrits en continu ; une désinstallation remet le compteur à zéro pour
>    tout le monde.
>
> Joue quand tu veux, même cinq minutes. Si tu vois un bug, écris-moi.

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
