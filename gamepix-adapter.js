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

/* ── Audio mute/unmute via Unity's AudioContext ─────────────────────────────
   Unity WebGL exposes its AudioContext through unityInstance.Module.
   We suspend it during ads so game audio doesn't play over ad audio,
   then resume it once the ad is done. */
function _muteAudio() {
    try {
        var ctx = window.unityInstance && window.unityInstance.Module &&
                  (window.unityInstance.Module.ctx || window.unityInstance.Module.audioContext);
        if (ctx && ctx.state !== 'suspended') ctx.suspend();
    } catch(e) {}
    /* Fallback: mute any HTML audio/video elements */
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
    /* Fallback: unmute any HTML audio/video elements */
    try {
        document.querySelectorAll('audio, video').forEach(function(el) { el.muted = false; });
    } catch(e) {}
}

function _pauseGame()  {
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

window.bridge = {
    game: {
        setLoadingProgress: function(percentage) {
            if (window.GamePix && typeof GamePix.loading === 'function') {
                GamePix.loading(Math.floor(percentage));
            }
        },
        on: function(event, callback) {
            _gameEmitter.on(event, callback);
        },
        gameOver: function(score, level) {
            if (window.GamePix) {
                if (typeof score === 'number') GamePix.updateScore(score);
                if (typeof level === 'number') GamePix.updateLevel(level);
                GamePix.happyMoment();
                window.bridge.advertisement.showInterstitial();
            }
        },
        levelComplete: function(score, level) {
            if (window.GamePix) {
                if (typeof score === 'number') GamePix.updateScore(score);
                if (typeof level === 'number') GamePix.updateLevel(level);
                GamePix.happyMoment();
                window.bridge.advertisement.showInterstitial();
            }
        }
    },
    engine: 'unity',
    initialize: function() {
        console.log("GamePix Adapter Initialized");
        return Promise.resolve();
    },
    advertisement: {
        interstitialState: 'closed',
        rewardedState: 'closed',
        advancedBannersState: 'closed',
        rewardedPlacement: '',
        minimumDelayBetweenInterstitial: 60,
        isBannerSupported: false,
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
        showBanner: function() {},
        hideBanner: function() {},
        showAdvancedBanners: function() {},
        hideAdvancedBanners: function() {},
        showInterstitial: function() {
            if (!window.GamePix) return;
            console.log("GamePix Adapter: Requesting Interstitial");
            /* Pause game AND mute audio before ad */
            _pauseGame();
            _muteAudio();
            this.interstitialState = 'loading';
            _advEmitter.emit('interstitial_state_changed', 'loading');
            GamePix.interstitialAd().then(function(res) {
                window.bridge.advertisement.interstitialState = 'closed';
                _advEmitter.emit('interstitial_state_changed', 'closed');
                /* Resume game AND unmute audio after ad */
                _resumeGame();
                _unmuteAudio();
            }).catch(function() {
                window.bridge.advertisement.interstitialState = 'failed';
                _advEmitter.emit('interstitial_state_changed', 'failed');
                _resumeGame();
                _unmuteAudio();
            });
        },
        showRewarded: function(placement) {
            if (!window.GamePix) return;
            console.log("GamePix Adapter: Requesting Rewarded Ad, placement:", placement);
            /* Pause game AND mute audio before rewarded ad */
            _pauseGame();
            _muteAudio();
            this.rewardedState = 'loading';
            _advEmitter.emit('rewarded_state_changed', 'loading');
            var rewardPromise = placement ? GamePix.rewardAd(placement) : GamePix.rewardAd();
            rewardPromise.then(function(res) {
                /* Unmute audio after rewarded ad regardless of outcome */
                _unmuteAudio();
                _resumeGame();
                if (res && res.success) {
                    window.bridge.advertisement.rewardedState = 'rewarded';
                    _advEmitter.emit('rewarded_state_changed', 'rewarded');
                } else {
                    window.bridge.advertisement.rewardedState = 'closed';
                    _advEmitter.emit('rewarded_state_changed', 'closed');
                }
            }).catch(function() {
                window.bridge.advertisement.rewardedState = 'failed';
                _advEmitter.emit('rewarded_state_changed', 'failed');
                _unmuteAudio();
                _resumeGame();
            });
        }
    },
    platform: {
        id: 'gamepix',
        get language() {
            return (window.GamePix && GamePix.lang) ? GamePix.lang() : 'en';
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
            if (window.GamePix && GamePix.localStorage) {
                var results = keys.map(function(key) {
                    return GamePix.localStorage.getItem(String(key));
                });
                return Promise.resolve(results);
            }
            return Promise.resolve(keys.map(function() { return null; }));
        },
        set: function(keys, values) {
            if (window.GamePix && GamePix.localStorage) {
                keys.forEach(function(key, i) {
                    var val = (typeof values[i] === 'string') ? values[i] : JSON.stringify(values[i]);
                    GamePix.localStorage.setItem(String(key), val);
                });
            }
            return Promise.resolve();
        },
        delete: function(keys) {
            if (window.GamePix && GamePix.localStorage) {
                keys.forEach(function(key) {
                    GamePix.localStorage.removeItem(String(key));
                });
            }
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

window.happyMoment = function() {
    if (window.GamePix) GamePix.happyMoment();
};

var _origAlert = window.alert;
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
