package com.fruitMixer.game

import android.annotation.SuppressLint
import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri
import android.os.Bundle
import android.text.SpannableString
import android.text.Spanned
import android.text.method.LinkMovementMethod
import android.text.style.ClickableSpan
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var bridge: AndroidBridge
    private lateinit var prefs: SharedPreferences

    private var interstitialAd: InterstitialAd? = null
    private var rewardedAd: RewardedAd? = null

    private val INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-1078340192803579/8788600203"
    private val REWARDED_AD_UNIT_ID     = "ca-app-pub-1078340192803579/3576902056"
    private val BANNER_AD_UNIT_ID       = "ca-app-pub-1078340192803579/7927210609"
    private val PRIVACY_POLICY_URL      = "https://lin480-arch.github.io"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        )

        setContentView(R.layout.activity_main)

        prefs   = getSharedPreferences("fruit_mixer_prefs", MODE_PRIVATE)
        webView = findViewById(R.id.webView)
        bridge  = AndroidBridge(this, webView)

        setupWebView()

        if (prefs.getBoolean("consent_given", false)) {
            initAds()
        } else {
            showPrivacyConsent()
        }
    }

    /* ── Privacy Consent Dialog ───────────────────────────────────────────── */

    private fun showPrivacyConsent() {
        val message = "We and our partners use technology such as cookies and device identifiers " +
            "to personalise content and ads, and to analyse our traffic.\n\n" +
            "We use Google AdMob to show you ads. By tapping AGREE you consent to our use " +
            "of your data as described in our Privacy Policy.\n\n" +
            "You can change your preferences at any time by reinstalling the app."

        val spannable = SpannableString(message)
        val privacyStart = message.indexOf("Privacy Policy")
        val privacyEnd   = privacyStart + "Privacy Policy".length
        spannable.setSpan(object : ClickableSpan() {
            override fun onClick(widget: View) {
                openPrivacyPolicy()
            }
        }, privacyStart, privacyEnd, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)

        val dialog = AlertDialog.Builder(this, R.style.PrivacyDialogTheme)
            .setTitle("We value your privacy")
            .setMessage(spannable)
            .setCancelable(false)
            .setPositiveButton("AGREE") { _, _ ->
                prefs.edit().putBoolean("consent_given", true).apply()
                initAds()
            }
            .setNegativeButton("MORE OPTIONS") { _, _ ->
                openPrivacyPolicy()
                showPrivacyConsent()
            }
            .create()

        dialog.show()

        dialog.findViewById<TextView>(android.R.id.message)?.movementMethod =
            LinkMovementMethod.getInstance()
    }

    private fun openPrivacyPolicy() {
        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(PRIVACY_POLICY_URL)))
    }

    /* ── Ads ──────────────────────────────────────────────────────────────── */

    private fun initAds() {
        MobileAds.initialize(this) { loadInterstitial(); loadRewarded() }
    }

    /* ── WebView ──────────────────────────────────────────────────────────── */

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled                = true
            domStorageEnabled                = true
            allowFileAccessFromFileURLs      = true
            allowUniversalAccessFromFileURLs = true
            mediaPlaybackRequiresUserGesture = false
            cacheMode                        = WebSettings.LOAD_DEFAULT
        }

        webView.webChromeClient = WebChromeClient()
        webView.webViewClient   = WebViewClient()
        webView.addJavascriptInterface(bridge, "AndroidBridge")
        webView.loadUrl("file:///android_asset/game/index.html")
    }

    /* ── Interstitial ─────────────────────────────────────────────────────── */

    private fun loadInterstitial() {
        InterstitialAd.load(this, INTERSTITIAL_AD_UNIT_ID, AdRequest.Builder().build(),
            object : InterstitialAdLoadCallback() {
                override fun onAdLoaded(ad: InterstitialAd) {
                    interstitialAd = ad
                    ad.fullScreenContentCallback = object : FullScreenContentCallback() {
                        override fun onAdDismissedFullScreenContent() {
                            interstitialAd = null
                            loadInterstitial()
                            bridge.callJS("onInterstitialAdClosed")
                        }
                        override fun onAdFailedToShowFullScreenContent(e: AdError) {
                            interstitialAd = null
                            loadInterstitial()
                            bridge.callJS("onInterstitialAdFailed")
                        }
                    }
                }
                override fun onAdFailedToLoad(e: LoadAdError) { interstitialAd = null }
            })
    }

    fun showInterstitial() {
        if (interstitialAd != null) interstitialAd!!.show(this)
        else { bridge.callJS("onInterstitialAdFailed"); loadInterstitial() }
    }

    /* ── Rewarded ─────────────────────────────────────────────────────────── */

    private fun loadRewarded() {
        RewardedAd.load(this, REWARDED_AD_UNIT_ID, AdRequest.Builder().build(),
            object : RewardedAdLoadCallback() {
                override fun onAdLoaded(ad: RewardedAd) {
                    rewardedAd = ad
                    ad.fullScreenContentCallback = object : FullScreenContentCallback() {
                        override fun onAdDismissedFullScreenContent() {
                            rewardedAd = null
                            loadRewarded()
                            bridge.callJS("onRewardedAdClosed")
                        }
                        override fun onAdFailedToShowFullScreenContent(e: AdError) {
                            rewardedAd = null
                            loadRewarded()
                            bridge.callJS("onRewardedAdFailed")
                        }
                    }
                }
                override fun onAdFailedToLoad(e: LoadAdError) { rewardedAd = null }
            })
    }

    fun showRewarded() {
        if (rewardedAd != null) rewardedAd!!.show(this) { bridge.callJS("onRewardedAdRewarded") }
        else { bridge.callJS("onRewardedAdFailed"); loadRewarded() }
    }

    /* ── Lifecycle ────────────────────────────────────────────────────────── */

    override fun onResume() {
        super.onResume()
        webView.onResume()
        webView.evaluateJavascript("window.onResumeGame && window.onResumeGame()", null)
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
        webView.evaluateJavascript("window.onPauseGame && window.onPauseGame()", null)
    }

    override fun onBackPressed() {}
}
