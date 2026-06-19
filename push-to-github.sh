#!/bin/bash

echo ""
echo "======================================"
echo "   Fruit Mixer → GitHub Uploader"
echo "======================================"
echo ""

read -p "Paste your GitHub repo link (e.g. https://github.com/YourName/fruit-mixer.git): " REPO_URL
read -p "Your GitHub username: " GH_USER
read -p "Paste your GitHub token (the long code): " GH_TOKEN

echo ""
echo "Connecting to GitHub..."

git remote remove origin 2>/dev/null
git remote add origin "https://${GH_USER}:${GH_TOKEN}@${REPO_URL#https://}"

echo "Uploading your files..."
git add .
git commit -m "Fruit Mixer - Android WebView + AdMob + UMP consent" 2>/dev/null || git commit --allow-empty -m "Update"
git push -u origin main --force

echo ""
echo "======================================"
echo " Done! Your files are on GitHub!"
echo "======================================"
