# Fruit Mixer — GitHub + Amazon Appstore Setup (Phone Only, No PC Needed)

---

## Step 1: Create your GitHub repository

1. Open https://github.com/new on your phone
2. Name it `fruit-mixer`
3. Set to **Private**
4. Do NOT tick "Add README"
5. Tap **Create repository**

---

## Step 2: Push this project to GitHub

Since you're on Replit (no PC), do this in the Replit Shell tab:

```bash
git remote add origin https://github.com/YOUR_USERNAME/fruit-mixer.git
git push -u origin main
```

When asked for a password, use a **GitHub Personal Access Token** (not your account password):
- GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token
- Select scope: `repo`
- Copy the token and paste it as your password

---

## Step 3: Generate your signing keystore (no PC needed)

Your keystore is your permanent developer identity — it proves updates to your app come from you.
**GitHub Actions will generate it for you.**

1. Go to your GitHub repo → **Actions** tab
2. Click **"🔑 Generate Keystore (Run Once)"** workflow
3. Click **"Run workflow"** (top right)
4. Fill in:
   - **Store password** — choose a strong password (write it down!)
   - **Key password** — can be the same password
   - **Developer name** — `Rock City` (or your name)
5. Click the green **Run workflow** button
6. Wait ~1 minute, then click the finished run
7. Download the **keystore-files** artifact
8. Open `keystore-base64.txt` — copy ALL the text inside

---

## Step 4: Add secrets to GitHub (so your APK gets signed)

Go to your repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these 4 secrets one by one:

| Secret Name         | Value                                        |
|---------------------|----------------------------------------------|
| `KEYSTORE_BASE64`   | Everything you copied from keystore-base64.txt |
| `KEYSTORE_PASSWORD` | The store password you chose in Step 3       |
| `KEY_ALIAS`         | `fruit-mixer-key`                            |
| `KEY_PASSWORD`      | The key password you chose in Step 3        |

---

## Step 5: Build your signed APK

1. Go to **Actions** tab → **"Build & Sign APK (Amazon Appstore)"**
2. Click **Run workflow** → **Run workflow**
3. Wait ~5 minutes
4. Download **FruitMixer-Amazon-Release** artifact
5. You get `FruitMixer-release.apk` — ready to upload to Amazon

---

## Step 6: Submit to Amazon Appstore

1. Go to https://developer.amazon.com/apps-and-games
2. Create new app → Android
3. Upload `FruitMixer-release.apk`
4. In the Privacy Policy field, enter: **https://nwalin480-arch.github.io/privacy-policy-/**
5. Submit for review

---

## Important — Keep your keystore safe!

- Download and save `fruit-mixer-release.keystore` from the artifact somewhere safe (Google Drive, email to yourself)
- If you lose it, you can never update the app on Amazon — you'd have to publish a brand new app
- The keystore-files artifact only stays for 1 day, so save it quickly!
