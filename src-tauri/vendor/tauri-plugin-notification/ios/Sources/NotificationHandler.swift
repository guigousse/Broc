// Copyright 2019-2023 Tauri Programme within The Commons Conservancy
// SPDX-License-Identifier: Apache-2.0
// SPDX-License-Identifier: MIT

import Tauri
import UserNotifications

public class NotificationHandler: NSObject, NotificationHandlerProtocol {

  public weak var plugin: Plugin?

  private var notificationsMap = [String: Notification]()

  internal func saveNotification(_ key: String, _ notification: Notification) {
    notificationsMap.updateValue(notification, forKey: key)
  }

  public func requestPermissions(with completion: ((Bool, Error?) -> Void)? = nil) {
    let center = UNUserNotificationCenter.current()
    center.requestAuthorization(options: [.badge, .alert, .sound]) { (granted, error) in
      completion?(granted, error)
    }
  }

  public func checkPermissions(with completion: ((UNAuthorizationStatus) -> Void)? = nil) {
    let center = UNUserNotificationCenter.current()
    center.getNotificationSettings { settings in
      completion?(settings.authorizationStatus)
    }
  }

  public func willPresent(notification: UNNotification) -> UNNotificationPresentationOptions {
    let notificationData = toActiveNotification(notification.request)
    try? self.plugin?.trigger("notification", data: notificationData)

    if let options = notificationsMap[notification.request.identifier] {
      if options.silent ?? false {
        return UNNotificationPresentationOptions.init(rawValue: 0)
      }
    }

    // PATCH BROC — pas de `.sound` au premier plan.
    //
    // `willPresent` n'est appelé QUE lorsque l'app est déjà à l'écran. Or le
    // son d'une notification y prend la session audio iOS, ce qui interrompt
    // le contexte Web Audio de la WebView : tout le son du jeu se taisait
    // d'un coup en pleine partie. Le cas était nominal, pas limite — la notif
    // « énergie pleine » se déclenche précisément quand le joueur assidu est
    // encore en train de jouer.
    //
    // La bannière et la pastille restent : l'information garde sa valeur,
    // c'est le son qui n'en a aucune quand le jeu est sous les yeux. En
    // arrière-plan, la notif sonne normalement — ce chemin ne passe pas ici.
    //
    // (Le garde `silent` ci-dessus ne suffisait pas : il lit une map tenue en
    // mémoire au moment de la programmation, vide pour toute notif posée lors
    // d'un lancement précédent.)
    return [
      .badge,
      .alert,
    ]
  }

  public func didReceive(response: UNNotificationResponse) {
    let originalNotificationRequest = response.notification.request
    let actionId = response.actionIdentifier

    var actionIdValue: String
    // We turn the two default actions (open/dismiss) into generic strings
    if actionId == UNNotificationDefaultActionIdentifier {
      actionIdValue = "tap"
    } else if actionId == UNNotificationDismissActionIdentifier {
      actionIdValue = "dismiss"
    } else {
      actionIdValue = actionId
    }

    var inputValue: String? = nil
    // If the type of action was for an input type, get the value
    if let inputType = response as? UNTextInputNotificationResponse {
      inputValue = inputType.userText
    }

    let received = ReceivedNotification(
      actionId: actionIdValue,
      inputValue: inputValue,
      notification: toActiveNotification(originalNotificationRequest)
    )

    // PATCH BROC — garder le tap en attente pour le JS.
    //
    // Au lancement à froid depuis une notif, ce `didReceive` tourne avant que
    // la WebView n'ait chargé un seul script : `trigger` n'a aucun écouteur et
    // l'événement part dans le vide. Le plugin garde donc le dernier tap ; le
    // JS le relit via la commande `lastAction` dès qu'il s'est abonné.
    (self.plugin as? NotificationPlugin)?.actionEnAttente = received

    try? self.plugin?.trigger("actionPerformed", data: received)
  }

  func toActiveNotification(_ request: UNNotificationRequest) -> ActiveNotification {
    // PATCH BROC — plus de `!` sur la map.
    //
    // `notificationsMap` ne vit qu'en mémoire : elle est VIDE pour toute notif
    // posée lors d'un lancement précédent — c'est-à-dire pour quasiment tout
    // tap réel, la notif « objet restauré » partant des heures après la
    // programmation. Le force-unwrap faisait planter l'app en plein
    // lancement : écran noir puis retour au springboard.
    let notificationRequest = notificationsMap[request.identifier]
    return ActiveNotification(
      id: Int(request.identifier) ?? -1,
      title: request.content.title,
      body: request.content.body,
      sound: notificationRequest?.sound ?? "",
      actionTypeId: request.content.categoryIdentifier,
      attachments: notificationRequest?.attachments
    )
  }

  func toPendingNotification(_ request: UNNotificationRequest) -> PendingNotification {
    return PendingNotification(
      id: Int(request.identifier) ?? -1,
      title: request.content.title,
      body: request.content.body
    )
  }
}

struct PendingNotification: Encodable {
  let id: Int
  let title: String
  let body: String
}

struct ActiveNotification: Encodable {
  let id: Int
  let title: String
  let body: String
  let sound: String
  let actionTypeId: String
  let attachments: [NotificationAttachment]?
}

struct ReceivedNotification: Encodable {
  let actionId: String
  let inputValue: String?
  let notification: ActiveNotification
}
