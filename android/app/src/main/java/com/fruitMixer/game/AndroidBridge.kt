package com.fruitMixer.game

import android.webkit.JavascriptInterface
import android.webkit.WebView

class AndroidBridge(
    private val activity: MainActivity,
    private val webView: WebView
) {

    /* ── Called by Unity/JS → Native ─────────────────────────────────────── */

    @JavascriptInterface
    fun showInterstitialAd() {
        activity.runOnUiThread {
            activity.showInterstitial()
        }
    }

    @JavascriptInterface
    fun showRewardedAd(placement: String) {
        activity.runOnUiThread {
            activity.showRewarded()
        }
    }

    @JavascriptInterface
    fun onGameReady() {
        android.util.Log.d("AndroidBridge", "Game is ready")
    }

    @JavascriptInterface
    fun onLoadingProgress(percent: Int) {
        android.util.Log.d("AndroidBridge", "Loading: $percent%")
    }

    @JavascriptInterface
    fun onGameOver(data: String) {
        android.util.Log.d("AndroidBridge", "Game over: $data")
    }

    @JavascriptInterface
    fun onLevelComplete(data: String) {
        android.util.Log.d("AndroidBridge", "Level complete: $data")
    }

    @JavascriptInterface
    fun getLanguage(): String {
        return activity.resources.configuration.locales[0].language
    }

    /* ── Called by Native → Unity/JS ─────────────────────────────────────── */

    fun callJS(functionName: String) {
        webView.post {
            webView.evaluateJavascript("window.$functionName && window.$functionName()", null)
        }
    }
}
