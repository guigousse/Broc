# Profil Instagram — @broc.le.jeu

Validé le 2026-08-06. À appliquer à la main dans l'app Instagram.

## 1. Identité du profil

| Champ | Valeur |
|---|---|
| Handle | `@broc.le.jeu` (inchangé) |
| **Nom affiché** | **BROC · Jeu de brocante cosy** |
| Catégorie | Jeu vidéo |

- Le champ « Nom » est cherchable sur Instagram : il porte les mots-clés « jeu de brocante » et « cosy ».
- Vérifier que le compte est en **compte professionnel** (Réglages → Type de compte) : débloque la catégorie affichée, les statistiques et le bouton de contact.

## 2. Bio (118/150 caractères)

```
🛋️ Le jeu cosy de brocante sur iPhone
🔎 Chinez · 🛠️ Restaurez · 💰 Revendez
🇬🇧 A cozy flea market game
⬇️ Télécharger ↓
```

## 3. Lien App Store

- URL dans la bio (décision Guillaume 2026-08-06 : lien direct conservé) :
  `https://apps.apple.com/fr/app/broc-jeu-de-brocante/id6784023113`
- Titre du lien dans Instagram : **« Télécharger sur l'App Store »**
- ⚠ Jamais l'URL sans code pays (`apps.apple.com/app/id…`) : elle fait une 301 vers `/us/` (pas de géo-redirection).
- Point ouvert : sur l'iPhone de Guillaume, ce lien donne une **page blanche dans le navigateur intégré d'Instagram** (la pop-up native « Ouvrir dans App Store » n'y apparaît pas). À confirmer sur un autre téléphone / le compte d'un tiers avant de trancher. Si le problème est général, une page relais `site/telecharger.html` (schéma `itms-appss://` + bouton de secours, vérifiée Playwright) est prête dans le worktree fix/site-vitrine, non commitée — URL cible : `https://project-5yn6d.vercel.app/telecharger`.

## 4. Jeu de hashtags

En piocher **5 à 10 par post** selon le contenu — jamais tous d'un coup.

- **Niche FR** : `#brocante` `#videgrenier` `#chiner` `#jeumobile` `#jeuvideofrancais` `#brocantelovers`
- **Cozy EN** (la grosse communauté) : `#cozygames` `#cozygamer` `#cozygaming` `#cozymobilegames` `#indiegame` `#simulationgames`
- **Dev / fierté** : `#indiedev` `#gamedev` `#madeinfrance` `#soloDev`

## 5. Modèle de légende réutilisable

```
[Accroche courte qui pique la curiosité — 1 ligne]

[1-2 phrases : ce qu'on voit, pourquoi c'est chouette.]

🇬🇧 [Une ligne en anglais reprenant l'accroche]

📲 Le jeu est dispo sur l'App Store — lien dans la bio ⬇️

#cozygames #brocante #[5-8 hashtags adaptés au post]
```

### Exemple (visuel du tourne-disque)

> Ce vinyle dormait dans un carton depuis 40 ans. 🎶
>
> Dans Broc, chaque objet chiné a une histoire — à vous de flairer les trésors avant les autres.
>
> 🇬🇧 Every find has a story. A cozy flea market game, out now on iOS.
>
> 📲 Lien dans la bio ⬇️
>
> #cozygames #cozygamer #brocante #videgrenier #jeumobile #indiegame #madeinfrance

## 6. Légendes des 3 affiches teasing (2026-08-06)

### Affiche « aube » (`broc-teasing-fr.png` — étal au petit matin)

> Les meilleures affaires se font à l'aube. ☀️
>
> Pendant que la brume se lève, les vrais chineurs sont déjà là — la lampe Art déco, l'horloge, le vinyle introuvable… Dans Broc, chaque étal cache une pépite pour qui sait regarder.
>
> 🇬🇧 The best deals happen at dawn. Broc, a cozy flea market game — out now on iOS.
>
> 📲 Gratuit sur l'App Store — lien dans la bio ⬇️ Bientôt sur Google Play.
>
> #brocante #videgrenier #chiner #cozygames #cozygamer #jeumobile #indiegame #madeinfrance

### Affiche « bleue » (`broc-teasing-fr-bleu.png` — crépuscule à la lampe à pétrole)

> Quand le marché ferme, les trésors restent. 🕯️
>
> Une boîte à musique, un chandelier d'argent, un miroir qui a traversé un siècle… C'est l'heure bleue des brocantes, celle où l'on négocie le mieux. À vous de jouer.
>
> 🇬🇧 When the market closes, the treasures remain. A cozy flea market game, out now on iOS.
>
> 📲 Gratuit sur l'App Store — lien dans la bio ⬇️ Bientôt sur Google Play.
>
> #brocante #antiquites #chiner #cozygaming #cozymobilegames #simulationgames #jeuvideofrancais #indiedev

### Affiche « rouge » (`broc-teasing-fr-rouge.png` — couchant, machine à coudre)

> Cette machine à coudre a une histoire. À vous de l'écrire. 🌇
>
> Une danseuse de porcelaine, un vase Art déco, des chandeliers de laiton… Dans Broc, on chine, on restaure, on revend — et parfois, on garde pour sa collection.
>
> 🇬🇧 Every object tells a story. Hunt, restore, resell — a cozy flea market game on iOS.
>
> 📲 Gratuit sur l'App Store — lien dans la bio ⬇️ Bientôt sur Google Play.
>
> #brocante #videgrenier #brocantelovers #cozygames #cozygamer #gamedev #jeumobile #indiegame

**Conseils de publication** : un post par affiche, espacés de quelques jours (pas les 3 d'un coup) ; varier l'heure (18 h–21 h en semaine marche bien) ; répondre aux commentaires dans l'heure quand c'est possible — l'algorithme y est sensible.

## 7. Réglages qui rapportent

- **Épingler** le meilleur des 3 posts existants en haut de la grille (⋯ → Épingler au profil).
- Ajouter un **texte alternatif** aux images des futurs posts (accessibilité + référencement Instagram).

## Checklist d'application

- [ ] Passer en compte professionnel (si pas déjà fait)
- [ ] Nom affiché → « BROC · Jeu de brocante cosy »
- [ ] Catégorie → Jeu vidéo
- [ ] Coller la bio
- [ ] Ajouter le lien App Store avec son titre
- [ ] Épingler le meilleur post
