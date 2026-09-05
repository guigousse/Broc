package com.guigousse.broc.admob

import android.app.Activity
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.Plugin

/**
 * Pubs récompensées AdMob sur Android. Pendant Kotlin de AdmobBridge.swift
 * (gen/apple/Sources/app), sans pont intermédiaire : contrairement à swift-rs,
 * Gradle résout le SDK Google, la classe l'importe directement.
 *
 * Squelette de la Task 1 : prouve que le module compile et se charge. La
 * logique arrive en Task 3.
 */
@InvokeArg
class ArgsRewarded {
  var emplacement: String = ""
}

@TauriPlugin
class AdmobPlugin(private val activity: Activity) : Plugin(activity) {
  @Command
  fun initialize(invoke: Invoke) {
    invoke.resolve()
  }

  @Command
  fun showRewardedAd(invoke: Invoke) {
    invoke.reject("Pubs Android pas encore implémentées (Task 3)")
  }
}
