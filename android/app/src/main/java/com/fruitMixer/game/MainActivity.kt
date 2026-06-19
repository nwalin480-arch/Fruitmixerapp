package com.fruitMixer.game

import android.annotation.SuppressLint
import android.os.Bundle
import android.util.Log
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
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
import com.google.android.ump.ConsentInformation
import com.google.android.ump.ConsentRequestParameters
import com.google.android.ump.UserMessagingPlatform

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var bridge: AndroidBridge
    private lateinit var consentInformation: ConsentInformation

    private var interstitialAd: InterstitialAd? = null
    private var rewardedAd: RewardedAd? = null
    private var adsInitialized = false

    private val INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-1078340192803579/8788600203"
    private val REWARDED_AD_UNIT_ID     = "ca-app-pub-1078340192803579/3576902056"
    private val BANNER_AD_UNIT_ID       = "ca-app-pub-1078340192803579/7927210609"
    private val TAG                     = "FruitMixer"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        )

        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        bridge  = AndroidBridge(this, webView)

        setupWebView()
        requestConsent()
    }

    /* ── UMP Consent (Google's official consent form) ─────────────────────── */

    private fun requestConsent() {
        consentInformation = UserMessagingPlatform.getConsentInformation(this)

        val params = ConsentRequestParameters.Builder().build()

        consentInformation.requestConsentInfoUpdate(this, params,
            {
                UserMessagingPlatform.loadAndShowConsentFormIfRequired(this) { formError ->
                    if (formError != null) {
                        Log.e(TAG, "Consent form error: ${formError.message}")
                    }
                    if (consentInformation.canRequestAds()) {
                        initAds()
                    }
                }
            },
            { requestConsentError ->
                Log.e(TAG, "Consent info update failed: ${requestConsentError.message}")
                if (consentInformation.canRequestAds()) {
                    initAds()
                }
            }
        )

        if (consentInformation.canRequestAds()) {
            initAds()
        }
    }

    /* ── Ads Initialization ───────────────────────────────────────────────── */

    private fun initAds() {
        if (adsInitialized) return
        adsInitialized = true
        MobileAds.initialize(this) {
            loadInterstitial()
            loadRewarded()
        }
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
