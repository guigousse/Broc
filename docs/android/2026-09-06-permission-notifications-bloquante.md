# Android — la demande de permission de notification bloquait le jeu entier

Trouvé le 2026-09-06 pendant la recette des pubs AdMob, **hors de ce chantier**, et déjà
présent dans la **1.5.0 publiée sur le Play Store**. Corrigé sur `fix/android-notif-permission`.

## Le symptôme, tel qu'un joueur le vit

Après avoir répondu au dialogue « Autoriser Broc à envoyer des notifications », le jeu
fonctionne encore un moment. Puis, sans message d'erreur :

- les publicités récompensées ne se lancent plus ;
- la sauvegarde durable n'écrit plus ;
- au redémarrage, l'écran reste figé sur « Ouverture du local… ».

Rien dans les journaux ne signale d'erreur. L'application n'a pas planté, elle ne répond
simplement plus aux commandes natives.

## La cause, prouvée

`NotificationPlugin.requestPermissions`, côté Kotlin, ne répondait pas quand la permission
était **déjà accordée** sur Android 13 et plus :

```kotlin
if (getPermissionState(LOCAL_NOTIFICATIONS) !== PermissionState.GRANTED) {
  requestPermissionForAlias(LOCAL_NOTIFICATIONS, invoke, "permissionsCallback")
}
// ⚠ aucun else : ni invoke.resolve, ni invoke.reject
```

Or, côté Rust, `PluginHandle::run_mobile_plugin` attend la réponse par un `recv()`
**bloquant**. Chaque appel sans réponse immobilise donc un worker tokio **définitivement**.
Le runtime en compte autant que de cœurs, quatre sur l'émulateur. Au quatrième appel, plus
aucune commande asynchrone du jeu n'est servie, quel que soit le plugin concerné.

**Preuve par backtrace natif** (`adb root` puis `debuggerd -b <pid>`) : les quatre
`tokio-rt-worker` empilés dans
`mpsc::Receiver::recv` ← `run_mobile_plugin` ← `tauri_plugin_notification::mobile::Notification::request_permission`.

**Reproduction déterministe** : permission accordée, puis appeler la commande.
`is_permission_granted` répond en 60 ms, `request_permission` ne répond jamais.

Le défaut est **en amont** : `tauri-apps/plugins-workspace`, branche v2, avait le même code
au 2026-09-06. Ce n'est donc pas un retard de version de notre copie vendorée.

## Pourquoi la garde du jeu ne suffisait pas

`demanderPermission` teste bien `isPermissionGranted()` avant de demander. Mais cette
fonction du plugin lit d'abord `window.Notification.permission`, la valeur du navigateur,
qui peut diverger de la permission Android réelle. Dès qu'elles divergent, le jeu appelle
la commande dans l'état précis où elle ne répond pas.

Une garde côté jeu ne peut de toute façon pas être la solution : une commande native ne
doit jamais rester sans réponse, quel que soit son appelant.

## Le correctif

Une branche `else` qui répond l'état courant, exactement comme le fait déjà
`permissionsCallback` juste en dessous dans le même fichier. Marqué `PATCH BROC` dans
`src-tauri/vendor/tauri-plugin-notification/android/src/main/java/NotificationPlugin.kt`.

Garde de non-régression : `src/lib/notifications/permissionAndroid.test.ts`. Elle lit le
source Kotlin, faute de harnais JVM dans ce dépôt, et échouera si une resynchronisation
avec l'amont réintroduit le chemin sans réponse.

## Vérifié sur émulateur, après reconstruction

| Cas | Avant | Après |
|---|---|---|
| Permission déjà accordée | aucune réponse, jamais | 5 à 39 ms |
| Huit appels consécutifs, soit deux fois le nombre de cœurs | jeu bloqué dès le quatrième | huit réponses, jeu toujours réactif |
| Dialogue affiché puis accepté | non testable, le chemin était noyé | la promesse se résout à la réponse du joueur |

## Risque résiduel, non traité ici

`PluginManager.onActivityCreate` de Tauri sort immédiatement si une activité a déjà été
enregistrée, avec un `TODO` amont assumé. Après une recréation d'activité sans mort du
processus, le lanceur de permissions reste attaché à l'activité détruite et son retour ne
revient jamais. Observé une fois pendant la recette, dans un état où le System UI de
l'émulateur partait en boucle d'ANR.

Portée : au plus un worker perdu, sur un chemin emprunté une fois par installation. Sans
commune mesure avec le défaut corrigé, qui frappait à chaque appel. À signaler en amont
plutôt qu'à contourner ici.

## À faire de ce correctif

Il concerne toutes les builds Android. Il doit donc rejoindre `feat/android-socle`, qui
alimente le Play Store, et `main` pour ne pas être perdu au prochain report. Sur iOS, la
demande de permission passe par le code Swift du plugin et n'est pas affectée.
