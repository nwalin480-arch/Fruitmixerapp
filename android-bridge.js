function _makeEmitter() {
    var listeners = {};
    return {
        on: function(event, callback) {
            if (!listeners[event]) listeners[event] = [];
            listeners[event].push(callback);
        },
        emit: function(event, value) {
            if (listeners[event]) {
                listeners[event].forEach(function(cb) { cb(value); });
            }
        }
    };
}

var _gameEmitter     = _makeEmitter();
var _platformEmitter = _makeEmitter();
var _advEmitter      = _makeEmitter();

function _muteAudio() {
    try {
        var ctx = window.unityInstance && window.unityInstance.Module &&
                  (window.unityInstance.Module.ctx || window.unityInstance.Module.audioContext);
        if (ctx && ctx.state !== 'suspended') ctx.suspend();
    } catch(e) {}
    try {
        document.querySelectorAll('audio, video').forEach(function(el) { el.muted = true; });
    } catch(e) {}
}

function _unmuteAudio() {
    try {
        var ctx = window.unityInstance && window.unityInstance.Module &&
                  (window.unityInstance.Module.ctx || window.unityInstance.Module.audioContext);
        if (ctx && ctx.state === 'suspended') ctx.resume();
    } catch(e) {}
    try {
        document.querySelectorAll('audio, video').forEach(function(el) { el.muted = false; });
    } catch(e) {}
}

function _pauseGame() {
    if (!window._unityReady) return;
    _gameEmitter.emit('visibility_state_changed', 'hidden');
    _platformEmitter.emit('pause_state_changed', true);
}

function _resumeGame() {
    if (!window._unityReady) return;
    _gameEmitter.emit('visibility_state_changed', 'visible');
    _platformEmitter.emit('pause_state_changed', false);
}

document.addEventListener('visibilitychange', function() {
    if (document.hidden) { _pauseGame(); _muteAudio(); }
    else                 { _resumeGame(); _unmuteAudio(); }
});

/* ── Native Android bridge callbacks (called by native shell) ───────────────
   The Android WebView calls these functions after ad events complete.        */

window.onInterstitialAdLoaded = function() {
    window.bridge.advertisement.interstitialState = 'loaded';
    _advEmitter.emit('interstitial_state_changed', 'loaded');
};

window.onInterstitialAdClosed = function() {
    window.bridge.advertisement.interstitialState = 'closed';
    _advEmitter.emit('interstitial_state_changed', 'closed');
    _resumeGame();
    _unmuteAudio();
};

window.onInterstitialAdFailed = function() {
    window.bridge.advertisement.interstitialState = 'failed';
    _advEmitter.emit('interstitial_state_changed', 'failed');
    _resumeGame();
    _unmuteAudio();
};

window.onRewardedAdLoaded = function() {
    window.bridge.advertisement.rewardedState = 'loaded';
    _advEmitter.emit('rewarded_state_changed', 'loaded');
};

window.onRewardedAdRewarded = function() {
    window.bridge.advertisement.rewardedState = 'rewarded';
    _advEmitter.emit('rewarded_state_changed', 'rewarded');
};

window.onRewardedAdClosed = function() {
    window.bridge.advertisement.rewardedState = 'closed';
    _advEmitter.emit('rewarded_state_changed', 'closed');
    _resumeGame();
    _unmuteAudio();
};

window.onRewardedAdFailed = function() {
    window.bridge.advertisement.rewardedState = 'failed';
    _advEmitter.emit('rewarded_state_changed', 'failed');
    _resumeGame();
    _unmuteAudio();
};

/* ── Helper: safely call a method on the native Android interface ───────── */
function _callNative(method, arg) {
    try {
        if (window.AndroidBridge && typeof window.AndroidBridge[method] === 'function') {
            arg !== undefined ? window.AndroidBridge[method](arg) : window.AndroidBridge[method]();
            return true;
        }
    } catch(e) {
        console.warn('[AndroidBridge] call failed:', method, e);
    }
    return false;
}

window.bridge = {
    game: {
        setLoadingProgress: function(percentage) {
            _callNative('onLoadingProgress', Math.floor(percentage));
        },
        on: function(event, callback) {
            _gameEmitter.on(event, callback);
        },
        gameOver: function(score, level) {
            _callNative('onGameOver', JSON.stringify({ score: score, level: level }));
            window.bridge.advertisement.showInterstitial();
        },
        levelComplete: function(score, level) {
            _callNative('onLevelComplete', JSON.stringify({ score: score, level: level }));
            window.bridge.advertisement.showInterstitial();
        }
    },
    engine: 'unity',
    initialize: function() {
        console.log('[AndroidBridge] Initialized');
        _callNative('onGameReady');
        return Promise.resolve();
    },
    advertisement: {
        interstitialState: 'closed',
        rewardedState: 'closed',
        minimumDelayBetweenInterstitial: 60,
        isBannerSupported: true,
        isInterstitialSupported: true,
        isRewardedSupported: true,
        isAdvancedBannersSupported: false,
        setMinimumDelayBetweenInterstitial: function(seconds) {
            this.minimumDelayBetweenInterstitial = parseInt(seconds, 10) || 60;
        },
        on: function(event, callback) {
            _advEmitter.on(event, callback);
        },
        checkAdBlock: function() {
            return Promise.resolve(false);
        },
        showBanner: function() { _callNative('showBanner'); },
        hideBanner: function() { _callNative('hideBanner'); },
        showAdvancedBanners: function() {},
        hideAdvancedBanners: function() {},
        showInterstitial: function() {
            console.log('[AndroidBridge] Requesting Interstitial');
            _pauseGame();
            _muteAudio();
            this.interstitialState = 'loading';
            _advEmitter.emit('interstitial_state_changed', 'loading');
            if (!_callNative('showInterstitialAd')) {
                window.onInterstitialAdFailed();
            }
        },
        showRewarded: function(placement) {
            console.log('[AndroidBridge] Requesting Rewarded Ad, placement:', placement);
            _pauseGame();
            _muteAudio();
            this.rewardedState = 'loading';
            _advEmitter.emit('rewarded_state_changed', 'loading');
            if (!_callNative('showRewardedAd', placement || '')) {
                window.onRewardedAdFailed();
            }
        }
    },
    platform: {
        id: 'android',
        get language() {
            try {
                return (window.AndroidBridge && window.AndroidBridge.getLanguage())
                    || navigator.language.split('-')[0]
                    || 'en';
            } catch(e) { return 'en'; }
        },
        payload: '',
        tld: 'com',
        isAudioEnabled: true,
        isGetAllGamesSupported: false,
        isGetGameByIdSupported: false,
        on: function(event, callback) {
            _platformEmitter.on(event, callback);
        },
        sendMessage: function() {},
        sendCustomMessage: function() {},
        getAllGames: function() { return Promise.resolve([]); },
        getGameById: function() { return Promise.resolve(null); },
        getServerTime: function() { return Promise.resolve(Date.now()); }
    },
    storage: {
        defaultType: 'local_storage',
        isSupported: function() { return true; },
        isAvailable: function() { return true; },
        get: function(keys) {
            return Promise.resolve(keys.map(function(key) {
                return localStorage.getItem(String(key));
            }));
        },
        set: function(keys, values) {
            keys.forEach(function(key, i) {
                var val = (typeof values[i] === 'string') ? values[i] : JSON.stringify(values[i]);
                localStorage.setItem(String(key), val);
            });
            return Promise.resolve();
        },
        delete: function(keys) {
            keys.forEach(function(key) {
                localStorage.removeItem(String(key));
            });
            return Promise.resolve();
        }
    },
    device: {
        type: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        safeArea: { top: 0, bottom: 0, left: 0, right: 0 }
    },
    player: {
        isAuthorizationSupported: false,
        isAuthorized: false,
        id: null,
        name: null,
        photos: [],
        extra: null,
        authorize: function() { return Promise.reject(); }
    }
};

window.alert = function(msg) {
    var banner = document.getElementById('error-banner');
    if (banner) {
        banner.textContent = msg;
        banner.style.display = 'block';
    } else {
        console.error('[Unity alert]', msg);
    }
};
window.confirm = function(msg) { console.warn('[confirm suppressed]', msg); return false; };

window.addEventListener('keydown', function(e) {
    if (['ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
});
window.addEventListener('wheel', function(e) {
    e.preventDefault();
}, { passive: false });
