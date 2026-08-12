// ⚠ Fichier généré par `tauri android init` mais ÉDITÉ À LA MAIN : pont
//   `BrocInsets`, qui donne au front la zone sûre du bas. Ne pas régénérer
//   sans reporter ce réglage (même situation que AndroidManifest.xml ici, et
//   que main.mm / AdmobBridge.swift côté iOS).
package com.guigousse.broc

import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : TauriActivity() {
  /**
   * Hauteurs des barres système, en pixels CSS. Écrites depuis le fil principal
   * par l'écouteur d'insets, lues depuis le fil du pont JavaScript : d'où les
   * `@Volatile`.
   */
  @Volatile
  private var hautPx: Float = 0f

  @Volatile
  private var basPx: Float = 0f

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }

  /**
   * La WebView Android ne renseigne pas `env(safe-area-inset-*)` de façon
   * fiable : sur un même APK, l'inset du haut valait 49 px puis 0 px un quart
   * d'heure plus tard (header sous la barre d'état, `LEVEL` sous le poinçon de
   * la caméra), et celui du bas reste à 0 alors que la barre de gestes occupe
   * 24 px CSS — 48 px en mode trois boutons. `WindowInsetsCompat`, lui, donne
   * les deux bords sans hésiter.
   *
   * On mesure donc côté natif et on laisse le front venir chercher la valeur
   * (`window.BrocInsets`, cf. src/lib/zoneSureAndroid.ts) : les insets sont
   * appliqués avant que le document existe, une écriture poussée depuis Kotlin
   * serait perdue au chargement de la page.
   */
  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)

    ViewCompat.setOnApplyWindowInsetsListener(webView) { _, insets ->
      val barres = insets.getInsets(WindowInsetsCompat.Type.systemBars())
      val densite = resources.displayMetrics.density
      hautPx = barres.top / densite
      basPx = barres.bottom / densite
      // Rendu tel quel : on mesure, on ne consomme pas — la WebView doit
      // rester bord à bord.
      insets
    }

    webView.addJavascriptInterface(PontInsets(), "BrocInsets")
  }

  /** Le pont lu par le front. Les méthodes annotées sont conservées par R8. */
  private inner class PontInsets {
    @JavascriptInterface
    fun hautPx(): Float = this@MainActivity.hautPx

    @JavascriptInterface
    fun basPx(): Float = this@MainActivity.basPx
  }
}
