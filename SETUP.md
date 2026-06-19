# Fruit Mixer — GitHub + Amazon Appstore Setup Guide

## Step 1: Create your GitHub repository

1. Go to https://github.com/new
2. Name it `fruit-mixer` (or anything you like)
3. Set it to **Private** (recommended)
4. Do NOT initialize with README (we already have one)
5. Click **Create repository**

## Step 2: Push this project to GitHub

Open a terminal and run:

```bash
git init
git add .
git commit -m "Fruit Mixer Android – AdMob wired in"
git remote add origin https://github.com/YOUR_USERNAME/fruit-mixer.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

---

## Step 3: Create your signing keystore (do this ONCE on your PC)

GitHub does NOT sign your APK automatically — you need your own keystore.
This keystore is your developer identity. **Keep it safe forever.**

Run this command on your computer (you need Java installed):

```bash
keytool -genkeypair -v \
  -keystore fruit-mixer-release.keystore \
  -alias fruit-mixer-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass YOUR_STORE_PASSWORD \
  -keypass YOUR_KEY_PASSWORD \
  -dname "CN=Rock City, OU=Games, O=Rock City, L=City, S=State, C=US"
```

Replace `YOUR_STORE_PASSWORD` and `YOUR_KEY_PASSWORD` with strong passwords you choose.

---

## Step 4: Add your keystore to GitHub Secrets

1. Convert your keystore to base64:
   ```bash
   base64 -w 0 fruit-mixer-release.keystore
   ```
   This prints a long string of letters — copy it all.

2. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**

3. Add these 4 secrets (click "New repository secret" for each):

   | Secret Name        | Value                              |
   |--------------------|------------------------------------|
   | `KEYSTORE_BASE64`  | The long base64 string from step 1 |
   | `KEYSTORE_PASSWORD`| Your store password                |
   | `KEY_ALIAS`        | `fruit-mixer-key`                  |
   | `KEY_PASSWORD`     | Your key password                  |

---

## Step 5: Build your APK

1. Push any change to the `main` branch (or go to **Actions** tab and click **Run workflow**)
2. Wait ~5 minutes for the build to finish
3. Click the completed workflow run
4. Download **FruitMixer-Amazon-Release** from the Artifacts section
5. You get a signed `FruitMixer-release.apk` ready for Amazon

---

## Step 6: Submit to Amazon Appstore

1. Go to https://developer.amazon.com/apps-and-games
2. Create a new app → Android
3. Upload your `FruitMixer-release.apk`
4. Fill in your privacy policy URL: **https://lin480-arch.github.io**
5. Submit for review

---

## Important notes

- **Never share your keystore or passwords** — losing them means you can never update the app
- Amazon Appstore accepts APK files directly (unlike Google Play which prefers AAB)
- Your privacy policy at `https://lin480-arch.github.io` is already referenced inside the app
