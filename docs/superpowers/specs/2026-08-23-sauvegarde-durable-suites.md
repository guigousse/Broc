# Sauvegarde durable — ce qui reste après la revue finale

**Date :** 2026-08-23
**Branche :** `worktree-sauvegarde-durable`, 34 commits depuis `ff253008`

La revue finale de branche a rendu « prêt à livrer, avec correctifs ». Le défaut
Critical et les sept Important ont été corrigés et re-vérifiés. Ce document garde
la trace de ce qui a été **délibérément laissé de côté**, pour que rien ne meure
avec l'espace de travail temporaire.

## Le défaut que la revue finale a rattrapé

La permission ACL du plugin n'était accordée nulle part : `capabilities/default.json`
ne listait pas `stockage:default` alors que `src-tauri/src/lib.rs` enregistre le
plugin. L'ACL de Tauri v2 refusant par défaut, chaque commande aurait été rejetée
avant d'atteindre Rust — et comme `save()` sort avant l'écriture miroir, **la build
livrée n'aurait sauvegardé nulle part**, avec un bandeau permanent. Strictement
pire que l'incident d'origine.

Aucune barrière automatique ne pouvait le voir : tests, lint, `npm run build` et
`cargo check` passaient tous. Le dépôt portait déjà le même défaut une fois
(`c71c45e1`, permission haptique). C'était un **défaut du plan** : le mot
« capabilities » n'apparaissait dans aucun artefact du chantier.

Le filet est désormais posé : `scripts/capabilities-acl.test.mjs` vérifie que tout
plugin enregistré dans `lib.rs` a son entrée de permission. Il attrapera le septième.

## Constatations mineures résiduelles

Aucune ne bloque, toutes sont vérifiées et bornées.

**Les deux qui valent cinq minutes avant de reprendre le sujet**

1. `src-tauri/vendor/tauri-plugin-stockage/src/mobile.rs:34-39` — commentaire périmé
   affirmant que la garde sur nom vide sert de sonde de disponibilité. C'était vrai
   avant le ruling R15 ; `commands.rs:55-59` dit désormais le contraire, correctement.
   Le commentaire **désinforme sur l'invariant qu'on vient de changer**.
2. La fiche de recette a **deux points numérotés 5** (spec `:501` et `:544`), et
   celui de l'occlusion est intercalé entre les points 2 et 3. La fiche est
   l'artefact exécuté à la main : ce seam la rend ambiguë.

**Les six autres**

3. Fenêtre d'arbitrage étroite et auto-guérissante : un échec d'étape 1 écrit le
   miroir en révision R pendant que l'index fichier reste à R−1 ; si une sauvegarde
   *ultérieure* réussit son étape 1 mais échoue son étape 2, le fichier porte du
   contenu frais que l'index sous-estime, et le miroir plus ancien gagne. Exige que
   l'écriture de 87 Ko passe pendant que celle de 200 octets échoue — ce qu'un
   `ENOSPC` ne produit pas. Se referme à la sauvegarde suivante. Fermeture possible :
   écrire aussi le miroir sur échec d'étape 2, avec le même contenu frais.
4. Les `.tmp` orphelins ne sont plus bornés : le nom unique (nécessaire contre les
   écritures concurrentes) fait qu'un kill entre `File::create` et `rename` laisse
   87 Ko que rien ne balaiera. Or ce flush est branché sur `pagehide`, soit le moment
   où iOS tue le plus volontiers. Un `read_dir` supprimant `{nom}.*.tmp` à l'écriture
   réussie coûterait peu.
5. Six références de ligne périmées dans la section Swift de la spec (`:559-600`) :
   le correctif de traversée a ajouté 12 lignes au-dessus. Le point de recette 5
   renvoie le lecteur à cette section.
6. Deux lignes d'implémentation sans test qui échouerait sans elles : la branche de
   ménage écriture/`sync_all` (`fichiers.rs:54-56`), et le `if (resultat.ok)` de
   l'estampillage (`fichierGameRepository.ts:123`) — le test existant jette sur
   *tous* les `setItem` et ne distingue donc pas les deux comportements.
7. Le test ACL compare des préfixes : `stockage:allow-lire-save` seul passerait
   alors que toute écriture serait refusée. Compromis assumé (`haptics` n'a qu'une
   permission granulaire). Il ne lit aussi que `capabilities/default.json`.
8. `estMetaSlotValide` (`slots.ts:52`) accepte `typeof revision === "number"` plutôt
   que `Number.isFinite`. Sans effet aujourd'hui (`JSON.stringify` ne peut pas
   persister `NaN`), mais c'est le seul endroit où la règle du correctif 7 n'est pas
   énoncée symétriquement.

## Hors périmètre, assumé

- **Sauvegarde cloud** — étudiée, écartée : elle résout la perte d'appareil, pas ce
  bug. La sauvegarde iPhone couvre déjà gratuitement son cas d'usage principal.
- **Import de sauvegarde** — l'export permet d'archiver, pas de restaurer soi-même.
  Une restauration passe par le développeur. Opération destructive, conception propre.
- **Compression de la collection** (87 Ko → ~30 Ko) — migration `SAVE_VERSION`
  indépendante, et elle n'aurait pas empêché l'incident.

## L'incertitude qui reste

Le chemin `ENOSPC` authentique **n'est pas prouvé** et ne peut pas l'être sans
remplir réellement un iPhone ; la recette device passe par TestFlight sur ce Mac.
L'interrupteur de debug prouve toute la chaîne d'alerte, pas le comportement de
l'écriture atomique sous un disque réellement plein. Le Swift compile
(`swift build`, `cargo check --target aarch64-apple-ios`) mais n'a jamais tourné :
ni la disponibilité du contrôleur racine, ni la géométrie du popover iPad, ni la
copie en bac à sable.
