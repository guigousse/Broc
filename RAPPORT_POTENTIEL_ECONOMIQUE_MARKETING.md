# Broc — rapport de potentiel économique et plan marketing

**Date : 24 juillet 2026**  
**Périmètre : version iOS 1.0 observée dans le dépôt local**  
**Budget marketing : 50 € par mois maximum**

## 1. Résumé exécutif

### Verdict

**Broc possède un bon potentiel de niche, mais un potentiel financier limité dans sa configuration actuelle.** Le concept est distinctif, visuellement cohérent et beaucoup plus riche qu'un prototype : 17 brocantes, environ 392 objets de collection, 7 familles d'objets, restauration, négociation, vente, quêtes, compétences, événements, personnages, progression, notifications et plusieurs langues sont déjà présents.

Le jeu peut trouver un public francophone fidèle parmi les amateurs de jeux cosy, de collection, de décoration vintage, de vide-greniers et de gestion légère. Il est en revanche peu probable qu'il devienne rentable uniquement grâce aux publicités récompensées avec une acquisition plafonnée à 50 €/mois. La priorité n'est pas d'acheter des installations, mais de :

1. vérifier que le jeu retient réellement ses premiers joueurs ;
2. améliorer la conversion de la fiche App Store ;
3. créer une petite communauté organique ;
4. ajouter une monétisation volontaire et élégante ;
5. étendre ensuite la distribution à l'anglais, l'espagnol et Android.

### Note synthétique

| Dimension | Note | Lecture |
|---|---:|---|
| Différenciation | 8/10 | Thème rare, identité française mémorable |
| Qualité et profondeur perçues | 7,5/10 | Beaucoup de contenu, ambiance et systèmes imbriqués |
| Adéquation mobile | 7/10 | Boucles courtes, énergie, notifications, sauvegardes |
| Taille de marché immédiate | 5/10 | Niche française attractive mais étroite |
| Monétisation actuelle | 3/10 | Rewarded ads uniquement, revenu par joueur faible |
| Mesurabilité | 2/10 | Aucun analytics : impossible de piloter la rétention et le tunnel |
| Potentiel organique | 7/10 | Objets surprenants, “juste prix”, trouvailles et avant/après partageables |
| Potentiel économique global | **6/10** | Bon projet indie de niche ; faible probabilité de revenu important sans évolution |

### Objectif réaliste à douze mois

Un objectif sain serait **5 000 à 12 000 installations cumulées**, une note supérieure à 4,5/5, une rétention J1 de 30 % ou plus, J7 de 12 à 15 % et J30 de 5 à 8 %. Avec une monétisation hybride bien dosée, cela peut produire environ **700 à 2 500 € de chiffre d'affaires la première année**. Une percée éditoriale, influence ou App Store peut dépasser cette fourchette, mais ne doit pas servir de budget prévisionnel.

## 2. Analyse du produit

### Proposition de valeur

> **Chiner, négocier, restaurer et revendre des trésors dans une brocante française pleine de caractère.**

Le jeu réunit quatre plaisirs faciles à comprendre :

- la chasse au trésor ;
- la connaissance et l'estimation d'objets ;
- la négociation ;
- la progression d'une petite activité de brocanteur.

Cette combinaison est plus précise et plus authentique que celle des jeux d'enchères génériques. *Bid Wars*, concurrent indirect le plus évident, met en avant les enchères de box, le risque et le profit. Broc peut occuper un territoire plus chaleureux : **le cosy game de chine français**, fondé sur les objets, les histoires et les personnages.

### Forces observées

- Identité de marque déjà solide : nom court, palette, typographies, jazz, sons, façade et univers cohérents.
- Contenu substantiel : environ 364 objets communs/rares, 21 légendaires, 7 uniques et 17 lieux.
- Boucle complète : acquisition, négociation, stockage, restauration, préparation du stand, vente et collection.
- Progression longue : niveaux, compétences, chapitres, invitations, quêtes et déblocages.
- Bon potentiel de retour : énergie rechargeable, restaurations temporisées, quotidien/hebdomadaire, gazette et notifications.
- Publicités uniquement volontaires : énergie, fin de restauration et boîte mystère. C'est plus respectueux qu'un jeu rempli d'interstitiels.
- Localisation technique déjà prévue en français, anglais, espagnol et grec.
- Build web de production réussi et corpus de 139 fichiers de tests.
- Usage hors ligne et sauvegarde locale : rassurant et peu coûteux à exploiter.

### Faiblesses et risques

- **Aucune télémétrie produit.** La politique indique explicitement l'absence d'analytics. Il est donc impossible de connaître la rétention, la durée des sessions, les écrans d'abandon, les objets préférés ou la conversion des pubs.
- **Monétisation trop étroite.** Le plafond de 20 pubs d'énergie par jour est théorique ; la majorité des joueurs en regardera probablement 0 à 3. Sans IAP, chaque installation vaut peu.
- **Poids élevé.** Le dossier exporté atteint environ 155 Mo et les assets publics 122 Mo. Cela peut réduire la conversion en mobilité et augmenter la mémoire utilisée sur les anciens appareils.
- **Sauvegarde uniquement locale.** Une suppression de l'app ou un changement d'appareil peut faire perdre une longue collection. Pour un jeu de collection, ce risque affecte rétention, avis et volonté de payer.
- **Absence de boucle sociale.** Pas de partage natif de trouvaille, classement, visite de stand ou défi communautaire.
- **Nom difficile à référencer.** “Broc” est mémorable mais court, générique et proche d'apps utilitaires de brocante. Le sous-titre et les mots-clés devront porter le référencement.
- **Promesse potentiellement trop large.** Le nombre de systèmes peut rendre les premières minutes denses. Le tutoriel devra amener très vite à une trouvaille, une bonne négociation et une première vente.
- **Marché initial étroit.** Le thème est culturellement fort en France/Belgique francophone, mais les références et textes demanderont une vraie adaptation pour l'international.
- **Risque App Store/AdMob.** Le pont AdMob est personnalisé et l'ATT/consentement doit être testé sur appareil réel. Il faut aussi vérifier la fiche “App Privacy”, les SDK déclarés et les manifestes de confidentialité.

### Boucle idéale des dix premières minutes

1. Arrivée dans le QG et promesse narrative en moins de 30 secondes.
2. Première brocante immédiatement accessible.
3. Objet visuellement intrigant dans les deux premières minutes.
4. Négociation simple avec conséquence claire.
5. Retour, estimation/restauration rapide.
6. Première vente rentable et animation satisfaisante.
7. Révélation d'un objet rare encore verrouillé.
8. Invitation à revenir, sans afficher de publicité pendant ce premier parcours sauf choix explicite.

Le moment marketing central est : **“Je l'ai payé X, il valait Y.”** Il doit être compris et vécu avant toute friction.

## 3. Étude de marché

### Taille et dynamique

Le marché est immense mais très concurrentiel. Adjust estime que près de 3 milliards de personnes ont joué sur mobile en 2025. En Europe, les installations de jeux ont reculé de 7 %, tandis que les sessions ont progressé de 3 % : le marché récompense davantage les jeux qui conservent leurs joueurs que les simples volumes de téléchargement. Le ratio paid/organic européen est monté de 2,53 à 3,18, signe d'une pression publicitaire élevée. ([Adjust, Mobile App Trends 2026](https://adindex.ru/publication/analitics/search/342586/img/mobile-app-trends-2026.pdf))

En France, le marché total du jeu vidéo a reculé de 5,8 % à 5,7 Md€ en 2024, mais l'écosystème smartphone a progressé de 8 %. La demande existe donc, même si l'attention est disputée. ([Le Monde, synthèse du bilan SELL 2024](https://www.lemonde.fr/pixels/article/2025/03/26/jeux-video-ea-sports-fc-25-et-call-of-duty-dominent-un-marche-francais-en-berne_6586543_4408996.html))

### Tendances favorables à Broc

- Goût durable pour les jeux cosy, la collection et les expériences sans pression.
- Popularité culturelle de la seconde main, du vintage, de la décoration et des vide-greniers.
- Contenus vidéo “trouvaille”, “avant/après” et “combien vaut cet objet ?” naturellement compatibles avec TikTok, Reels et Shorts.
- Public iOS européen intéressant pour les rewarded ads : les vidéos récompensées ont généralement le meilleur eCPM, et iOS surperforme Android en Europe. ([Appodeal, eCPM Report 2025](https://appodeal.com/wp-content/uploads/2025/03/Appodeal-The-Latest-eCPM-Report-2025.pdf))
- Possibilité de toucher à la fois des joueurs et des communautés non gaming : chineurs, collectionneurs, amateurs d'antiquités et de décoration.

### Tendances défavorables

- Le coût d'acquisition gaming mondial a augmenté de 30 % en 2025, à 0,56 $ en moyenne ; un budget de 50 € ne permet donc pas de scaler.
- La rétention moyenne des jeux reste faible : 27 % à J1, 13 % à J7 et 5 % à J30. ([Adjust](https://adindex.ru/publication/analitics/search/342586/img/mobile-app-trends-2026.pdf))
- L'acquisition payante domine de plus en plus le mobile, ce qui avantage les grands éditeurs.
- Les jeux de simulation génériques sont nombreux ; seule une promesse très spécifique peut émerger organiquement.

### Concurrence

| Concurrent / substitut | Positionnement | Force | Opportunité pour Broc |
|---|---|---|---|
| **Bid Wars: Storage Auctions** | Enchères de box, objets rares, profit | Marque installée, centaines d'objets ; estimation récente d'environ 10 k téléchargements et 10 k$ mensuels mondiaux sur iOS | Être plus authentique, cosy, narratif et européen ; éviter le ton casino |
| **Bid Wars 2 / jeux Pawn Shop** | Achat-revente et empire commercial | Boucles F2P éprouvées | Mettre la relation humaine, la restauration et la culture des objets au premier plan |
| **Animal Crossing: Pocket Camp / jeux cosy** | Collection, décoration, personnages | Forte affection et rétention | S'inspirer du rendez-vous quotidien sans imiter la licence |
| **Merge Mansion et jeux de restauration** | Découverte narrative et remise en état | Onboarding et cliffhangers puissants | Transformer les objets légendaires et le grand-père en feuilleton |
| **Selency, apps de brocante réelles** | Chiner et négocier de vrais objets | Audience directement qualifiée | Partenariats éditoriaux et créateurs ; clarifier dans le sous-titre qu'il s'agit d'un jeu |
| **Apps de vide-greniers** | Trouver des événements réels | Référencement fort sur “brocante” | Acheter seulement des mots-clés explicitement ludiques pour éviter les mauvaises installations |

*L'estimation mensuelle de Bid Wars provient de [Sensor Tower](https://app.sensortower.com/overview/1023494154?country=US) et doit être lue comme un ordre de grandeur tiers, pas comme un chiffre audité.*

### Publics prioritaires

**Cœur de cible**

- 25–54 ans ;
- France, Belgique francophone, Suisse romande ;
- amateurs de cosy games, gestion légère, collection, décoration, vintage et brocantes ;
- sessions de 5 à 15 minutes, plusieurs fois par jour ;
- préférence pour une expérience paisible et peu agressive commercialement.

**Cible secondaire**

- 45–65 ans pratiquant réellement la chine ;
- moins familiers des codes F2P ;
- sensibles à l'authenticité, à la lisibilité et à l'absence de pubs forcées.

**Cible internationale après validation**

- joueurs anglophones attirés par une ambiance “French flea market” ;
- Espagne et marchés européens proches ;
- Android, indispensable pour élargir le volume publicitaire.

### Positionnement recommandé

> **Broc, le jeu cosy où chaque objet cache une histoire et peut devenir une affaire.**

Territoire de marque : chaleureux, malin, nostalgique, français, artisanal.  
À éviter : casino, spéculation agressive, fausse urgence, “devenez millionnaire”.

## 4. Modèle économique recommandé

### Situation actuelle : publicité récompensée

Le jeu propose trois contextes cohérents :

- récupérer une unité d'énergie ;
- terminer une restauration ;
- ouvrir une boîte mystère.

Ce choix respecte le joueur. Google décrit le rewarded comme un format “pull”, choisi par l'utilisateur, et indique que les bons jeux peuvent viser plus de 50 % de DAU engagés avec 80 % de complétion. Ce sont des objectifs hauts, pas une prévision. ([Google AdMob Rewarded Playbook](https://admob.google.com/home/resources/rewarded-ads-playbook/))

Le plafond technique de 20 pubs d'énergie par jour est trop haut pour servir d'objectif. Le tableau de bord doit plutôt suivre :

- 25–40 % des DAU regardant au moins une pub ;
- 1,2 à 2,5 impressions récompensées par DAU et par jour ;
- complétion supérieure à 80 % ;
- aucune baisse de rétention ou de note après modification d'un placement.

### Modèle recommandé : hybride respectueux

Conserver le téléchargement gratuit et les rewarded ads, puis ajouter :

1. **Pack de soutien “Ami de la brocante” — 3,99 €**  
   Badge, thème de carnet, musique/gramophone, 3 cartes postales et petit cadeau non compétitif.

2. **Pack Collectionneur — 6,99 €**  
   Cosmétiques supplémentaires, apparence du stand, cadres de collection, espace photo souvenir. Aucun objet nécessaire à la quête principale.

3. **Pack fondateur limité au lancement — 5,99 €**  
   Contenu cosmétique commémoratif. Ne pas utiliser de fausse rareté : dates clairement annoncées.

4. **Option confort à tester plus tard — 2,99 à 4,99 €**  
   Emplacement de restauration ou de stockage supplémentaire permanent, à condition de ne pas créer artificiellement le problème.

Éviter en version 1 :

- abonnement ;
- monnaie premium opaque ;
- loot boxes payantes ;
- interstitiels forcés ;
- vente directe d'énergie ;
- paywall sur les objets uniques ou la fin de l'histoire.

Pour les IAP, l'inscription au **Small Business Program** réduit la commission Apple à 15 % pour les développeurs éligibles sous le seuil de 1 M$ de proceeds. ([Apple](https://developer.apple.com/app-store/small-business-program/))

### Pourquoi l'IAP est nécessaire

À titre d'ordre de grandeur, un eCPM rewarded de 8 à 20 € signifie :

| Impressions récompensées/mois | Revenu pub estimé |
|---:|---:|
| 5 000 | 40–100 € |
| 20 000 | 160–400 € |
| 50 000 | 400–1 000 € |

Il faut donc des milliers de joueurs actifs réguliers pour générer un revenu significatif par la seule publicité. Un achat volontaire de 5,99 € produit environ autant de revenu brut que plusieurs centaines d'impressions.

## 5. Prévision économique

### Hypothèses

Les chiffres ci-dessous ne sont pas des promesses. Ils utilisent :

- lancement iOS francophone ;
- rétention de marché cible J1 27–35 %, J7 10–15 %, J30 4–8 % ;
- 1 à 2 rewarded ads par jour actif ;
- revenu publicitaire cumulé par installation de 0,05 à 0,12 € la première année ;
- conversion IAP de 0 à 2 % ;
- panier IAP moyen brut de 5 à 7 € ;
- commission Apple de 15 % si l'éligibilité Small Business est obtenue ;
- marketing de 600 €/an, hors temps de travail ;
- cotisation Apple Developer non incluse dans le budget marketing.

### Trois scénarios à douze mois

|  | Prudent | Central | Très bon indie |
|---|---:|---:|---:|
| Installations cumulées | 1 500 | 7 500 | 25 000 |
| Rétention J30 | 3 % | 6 % | 9 % |
| Revenu rewarded ads | 75 € | 600 € | 3 000 € |
| Conversion IAP | 0,5 % | 1,25 % | 2 % |
| Revenu IAP brut | 45 € | 560 € | 3 250 € |
| IAP net après 15 % Apple | 38 € | 476 € | 2 763 € |
| **Revenu total estimé** | **113 €** | **1 076 €** | **5 763 €** |
| Marketing annuel | 600 € | 600 € | 600 € |
| Solde avant autres coûts et impôts | **–487 €** | **+476 €** | **+5 163 €** |

Sans IAP, le scénario central tombe autour de 600 € et couvre à peine le marketing, avant le compte développeur, les éventuels services, les taxes et le temps de production.

### Seuils de décision

- **Avant publicité payante :** J1 ≥ 25 %, au moins 20 retours qualitatifs, crash-free sessions ≥ 99,5 %.
- **Produit prometteur :** J1 ≥ 30 %, J7 ≥ 12 %, J30 ≥ 5 %, note ≥ 4,5.
- **Prêt à accélérer :** conversion fiche ≥ 25 %, J30 ≥ 7 %, revenu par installation supérieur au CPI.
- **Stop paid acquisition :** CPI supérieur à la valeur à 30 jours pendant deux tests consécutifs.

Avec 50 €/mois, l'acquisition payante doit être considérée comme un **laboratoire de messages**, pas comme un moteur de croissance.

## 6. Instrumentation indispensable avant le lancement

La promesse “aucun analytics” protège la vie privée mais empêche toute décision économique. Il faut choisir l'une de ces voies :

- analytics respectueux et minimaux, sans publicité personnalisée ni profilage ;
- ou journal de métriques agrégées et anonymes, explicitement décrit dans la politique de confidentialité.

Événements minimum :

| Étape | Événement |
|---|---|
| Acquisition | première ouverture, langue, version, source App Store agrégée |
| Onboarding | début/fin de chaque étape, abandon |
| Boucle | brocante commencée/terminée, objet vu, négociation, achat |
| Valeur | restauration, mise en vente, vente, marge, rareté découverte |
| Rétention | session, jour depuis installation, notifications autorisées |
| Monétisation | prompt pub, pub disponible, démarrée, terminée, récompense ; vue IAP, achat |
| Qualité | erreur fatale, mémoire, temps de chargement, appareil/OS agrégés |

App Store Connect permet déjà d'analyser les sources, téléchargements, sessions, appareils actifs, ventes et rétention sans MMP payant. ([Apple App Analytics](https://developer.apple.com/help/app-store-connect-analytics/overview/analytics-dashboard/), [sources d'acquisition](https://developer.apple.com/help/app-store-connect-analytics/acquisition/acquisition))

KPI hebdomadaires :

- impressions de fiche → vues de fiche → téléchargements ;
- tutoriel terminé ;
- premier objet acheté ;
- première vente ;
- J1/J7/J30 ;
- sessions par DAU et durée médiane ;
- progression médiane à J7 ;
- taux d'opt-in pub et pubs/DAU ;
- ARPDAU pub, conversion IAP et revenu par installation ;
- crash-free sessions, avis et verbatims.

## 7. Stratégie App Store (ASO)

### Métadonnées françaises proposées

**Nom :** `Broc : Jeu de Brocante`  
**Sous-titre :** `Chinez, négociez, collectionnez`  
**Texte promotionnel :** `Parcourez les vide-greniers, dénichez des trésors, restaurez-les et faites prospérer votre stand. Chaque objet peut cacher une histoire.`

**Champ mots-clés à tester** — sans répéter les mots déjà dans le nom/sous-titre :

`vide-grenier,antiquités,vintage,cosy,gestion,marché,restauration,collection,objets,simulation`

Vérifier les longueurs exactes dans App Store Connect et la concurrence réelle avant soumission. Ne pas viser seul “brocante”, qui attire aussi des utilisateurs cherchant une carte d'événements.

### Ordre recommandé des captures

1. **“Dénichez des trésors oubliés”** — scène de chine + bel objet.
2. **“Négociez avec des vendeurs hauts en couleur”** — personnage et choix.
3. **“Restaurez chaque trouvaille”** — avant/après.
4. **“Vendez au juste prix”** — stand animé et bénéfice.
5. **“Complétez une immense collection”** — grille et raretés.
6. **“Percez les secrets de votre grand-père”** — dimension narrative.
7. **“Jouez à votre rythme, même hors ligne”** — bénéfice rationnel.

Préparer une vidéo de 15 à 25 secondes sans écran titre long : objet mystérieux, négociation, révélation de valeur, restauration, vente, collection.

### Tests

Apple autorise jusqu'à 70 pages produit personnalisées avec captures, textes et mots-clés distincts. Créer trois angles :

- “jeu cosy de collection” ;
- “brocante et juste prix” ;
- “restauration et gestion”.

Les pages disposent d'URL uniques et de mesures séparées. ([Apple, Custom Product Pages](https://developer.apple.com/help/app-store-connect/create-custom-product-pages/configure-multiple-product-page-versions))

## 8. Plan marketing à 50 € par mois

### Principe

Le temps créatif remplace l'argent. Le contenu doit toujours montrer un mini-récit ou poser une question ; une simple annonce “mon jeu est sorti” sera peu performante.

### Allocation

Ne pas fragmenter 50 € sur quatre plateformes. Utiliser un canal payant par mois.

| Usage | Budget mensuel | Règle |
|---|---:|---|
| Apple Ads Advanced | 30 € | Mots-clés exacts, France uniquement, après validation de la fiche |
| Amplification du meilleur Reel/TikTok | 20 € | Seulement si la vidéo dépasse déjà la médiane organique |
| Outils | 0 € | CapCut/Canva gratuits, App Store Connect, tableur |

Alternative les deux premiers mois : **0 € en social et 50 € sur Apple Ads** pour obtenir un premier signal de conversion. Le mois suivant, inverser si les vidéos organiques performent mieux.

Apple Ads Basic permet de définir budget mensuel et CPI maximal, mais Advanced est préférable ici pour exclure les intentions utilitaires. En France, le propriétaire de l'app et du compte publicitaire doit être le même en application de la loi Sapin. ([Apple Ads](https://ads.apple.com/app-store/help/apple-ads-basic/0039-promote-an-app-with-basic))

### Campagne Apple Ads

Groupes de mots-clés exacts :

- **intention jeu :** jeu brocante, jeu vide grenier, jeu antiquaire, jeu collection objets ;
- **genre :** jeu cosy, jeu gestion boutique, jeu négociation, jeu restauration ;
- **concurrents :** à tester séparément, avec plafond de CPI plus bas ;
- **discovery :** 5 € maximum par mois, Search Match surveillé.

Mots négatifs :

`agenda,carte,date,autour de moi,vendre,estimation,expertise,meuble,emploi`

Arrêter tout mot après 10–15 clics sans installation ou si le CPI dépasse la valeur économique estimée. Avec si peu de budget, juger surtout le taux de conversion, pas la rentabilité à court terme.

## 9. Plan de communication complet

### Piliers éditoriaux

1. **Le juste prix** — “Vous paieriez combien ?”
2. **La trouvaille du jour** — objet rare, histoire et estimation.
3. **Avant/après restauration** — transformation visuelle.
4. **Coulisses indie** — sons, illustrations, bugs amusants, choix de design.
5. **Personnages** — vendeur grincheux, mamie, antiquaire, grand-père.
6. **Communauté** — photo d'un véritable objet de joueur transformé en inspiration de jeu, avec autorisation.

### Canaux

**Priorité 1 : TikTok + Instagram Reels + YouTube Shorts**  
Une même vidéo verticale, adaptée légèrement. Trois publications par semaine.

**Priorité 2 : communautés qualifiées**  
Reddit francophone et cosy gaming, Discords indie/cosy, groupes Facebook de chineurs lorsque l'autopromotion est autorisée. Apporter d'abord du contenu intéressant.

**Priorité 3 : presse et microcréateurs**  
Créateurs de 2 000 à 50 000 abonnés sur brocante, vintage, déco, cosy games et jeux indés. Le taux d'affinité compte plus que la taille.

**Priorité 4 : présence physique**  
Cartes avec QR code chez brocanteurs partenaires ou lors d'événements, uniquement avec accord. C'est un canal presque gratuit et extraordinairement ciblé.

### Cadence hebdomadaire soutenable

| Jour | Publication | Exemple |
|---|---|---|
| Mardi | Question/jeu | “15 € pour ce vase : affaire ou arnaque ?” |
| Jeudi | Coulisses ou personnage | “Pourquoi ce vendeur refuse votre offre” |
| Samedi matin | Trouvaille/avant-après | Moment cohérent avec les sorties en brocante |
| Dimanche soir | Story/sondage | Résultat, objet suivant, appel TestFlight |

Répondre aux commentaires dans les 24 heures. Transformer les meilleures questions en prochaine vidéo.

### Calendrier de lancement sur douze semaines

**S–6 à S–5 — fondations**

- page d'attente simple avec email/TestFlight ;
- comptes sociaux uniformisés ;
- 12 vidéos préparées ;
- 30 à 50 testeurs ciblés ;
- instrumentation et fiche App Store finalisées.

**S–4 à S–3 — preuve**

- série “Vous paieriez combien ?” ;
- collecte structurée des abandons et bugs ;
- demande de témoignages utilisables ;
- premier contact avec 30 microcréateurs personnalisés.

**S–2 — révélation**

- date de sortie ;
- bande-annonce courte ;
- kit presse ;
- précommande App Store si le calendrier le permet ;
- annonce aux communautés ayant accepté l'autopromotion.

**S–1 — compte à rebours utile**

- un objet/jour, pas sept affiches identiques ;
- démonstration complète de la boucle ;
- accès anticipé à 5–10 créateurs ;
- correction des trois plus grosses frictions.

**Jour J**

- vidéo principale à 8 h–10 h ;
- email aux testeurs et presse ;
- réponse active aux commentaires ;
- demander un avis uniquement après une réussite en jeu, jamais au premier lancement ;
- aucun changement économique risqué.

**S+1 à S+2**

- publier les réactions et meilleures trouvailles ;
- corriger rapidement crashs et onboarding ;
- contacter Apple Editorial avec l'angle culturel et indépendant ;
- lancer 30 € d'Apple Ads si J1 et stabilité sont acceptables.

**S+3 à S+6**

- premier petit événement thématique ;
- test d'une autre première capture ;
- ajout du pack de soutien si la demande existe ;
- bilan rétention et source d'acquisition.

### Modèle de message pour microcréateurs

> Bonjour [prénom], je développe seul **Broc**, un jeu cosy français où l'on chine, négocie, restaure et revend des objets de brocante. Votre contenu sur [référence précise] m'a fait penser que l'univers pourrait vous plaire. Je peux vous envoyer un accès anticipé, sans obligation de publication. Si vous souhaitez en parler, vous êtes libre de montrer le jeu et de donner un avis honnête. Voici une vidéo de 20 secondes : [lien].

Pas de pièce jointe lourde, pas de communiqué générique, une seule relance après sept jours.

### Kit presse minimal

- pitch en une phrase et en 100 mots ;
- logo PNG transparent ;
- 8 captures verticales sans interface parasite ;
- bande-annonce 20 s et 60 s ;
- portrait/bio du développeur ;
- particularités : jeu français, brocante, objets, ambiance sonore, hors ligne ;
- date, prix, appareils, langues, lien App Store ;
- email de contact.

## 10. Roadmap produit priorisée

### Bloquant avant sortie

1. Tester le parcours complet sur plusieurs iPhone/iPad réels, dont appareil ancien.
2. Vérifier AdMob réel, UMP, ATT, mode hors ligne et absence de récompense en double.
3. Ajouter une télémétrie minimale et mettre à jour la politique de confidentialité.
4. Mesurer et réduire le poids initial ; charger certains assets à la demande si possible.
5. Tester la perte/reprise de sauvegarde, idéalement ajouter iCloud.
6. Faire relire intégralement les quatre langues affichées comme supportées.
7. Vérifier accessibilité, tailles de texte, contraste, VoiceOver et commandes.
8. Faire un soft launch TestFlight de 50 à 100 personnes pendant deux semaines.

### Dans les trente jours après sortie

- partage natif d'une carte “Payé X / Valeur Y” ;
- demande d'avis contextuelle ;
- événement hebdomadaire léger ;
- pack de soutien cosmétique ;
- optimisation de la première session à partir des données ;
- médiation publicitaire seulement lorsque le volume le justifie.

### Après validation

- Android ;
- sauvegarde cloud multiplateforme ;
- adaptation anglaise “French flea-market cosy game” ;
- saisons thématiques réutilisant les systèmes existants ;
- partenariats avec créateurs et brocanteurs ;
- fonctionnalités sociales asynchrones légères.

## 11. Expériences à mener

| Hypothèse | Test | KPI | Décision |
|---|---|---|---|
| Le “juste prix” attire plus que la gestion | Deux variantes de première capture | Conversion fiche | Garder l'angle gagnant après volume suffisant |
| Le tutoriel est trop long | Version courte vs actuelle | Première vente + J1 | Déployer si +10 % sans hausse d'erreurs |
| La restauration augmente le retour | Notification contextuelle optionnelle | Retour sous 24 h | Conserver si opt-in et rétention progressent |
| Les joueurs veulent soutenir le jeu | Présenter le pack cosmétique à J3 | Conversion, avis | Garder si ≥0,5 % sans rejet qualitatif |
| La pub énergie est bien valorisée | Tester +1 vs bonus alternatif | Opt-in, pubs/DAU, J7 | Choisir la valeur qui améliore revenu sans nuire à J7 |
| Le public brocante non gaming convertit | Page produit dédiée | Conversion + J7 | Continuer seulement si qualité comparable |

## 12. Risques et parades

| Risque | Probabilité | Impact | Parade |
|---|---:|---:|---|
| Peu de visibilité au lancement | Haute | Haut | ASO, microcréateurs, série vidéo répétable |
| Rétention insuffisante | Moyenne/haute | Très haut | Soft launch, analytics, accélérer première récompense |
| Revenu pub négligeable | Haute | Haut | IAP cosmétique, Android, international |
| Mauvais public attiré par “brocante” | Moyenne | Moyen | Sous-titre “jeu”, mots négatifs, pages dédiées |
| Perte de sauvegarde | Moyenne | Très haut | iCloud/export et communication claire |
| Rejet App Store/AdMob | Moyenne | Haut | test appareil, déclarations privacy, checklist de soumission |
| Taille/mémoire | Moyenne | Haut | audit assets, compression, chargement différé |
| Épuisement du développeur | Haute | Haut | 3 posts/semaine réutilisés, une mise à jour significative/mois |

## 13. Plan d'action immédiat

### Les sept prochains jours

1. Installer une version Release sur appareils réels.
2. Recruter 20 testeurs correspondant au cœur de cible.
3. Définir les événements analytics et le tableau KPI.
4. Produire les sept captures App Store selon l'ordre recommandé.
5. Enregistrer dix séquences vidéo verticales de gameplay.
6. Créer la série “Vous paieriez combien ?”.
7. Préparer une liste de 50 microcréateurs, puis contacter les 10 plus pertinents.

### Critère de lancement

Sortir publiquement seulement si :

- aucun bug bloquant dans 20 parcours complets ;
- au moins 70 % des testeurs atteignent la première vente ;
- J1 TestFlight indicatif supérieur à 25 % ;
- publicité réelle validée sans récompense erronée ;
- politique de confidentialité et déclarations App Store cohérentes ;
- page produit comprise en cinq secondes par une personne qui ne connaît pas le projet.

## Conclusion

Broc n'est pas un produit à “acheter en croissance” avec 50 € par mois. C'est un produit à **faire aimer**, puis à diffuser par son thème, ses objets et ses histoires. Son avantage tient dans une identité que les gros jeux d'enchères possèdent rarement : chaleur, culture française, attention aux détails et plaisir de la trouvaille.

La voie économique la plus crédible est :

> **soft launch mesuré → rétention → contenu organique → ASO → IAP cosmétique → Android/international.**

Si la rétention centrale est atteinte, le jeu peut devenir un petit actif indie rentable et durable. Si elle ne l'est pas, aucun achat média à 50 € ou 500 € par mois ne corrigera le problème : l'argent doit alors rester consacré au produit.
