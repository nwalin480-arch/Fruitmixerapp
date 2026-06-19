-keep class com.fruitMixer.game.AndroidBridge { *; }
-keepclassmembers class com.fruitMixer.game.AndroidBridge {
    @android.webkit.JavascriptInterface <methods>;
}
