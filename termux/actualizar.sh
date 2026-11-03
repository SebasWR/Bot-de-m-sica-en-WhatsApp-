#!/data/data/com.termux/files/usr/bin/bash
# Baja la última versión del bot y lo reinicia.
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
git fetch origin "$BRANCH" && git reset --hard "origin/$BRANCH"
npm ci --ignore-scripts --omit=peer --no-audit --no-fund
pip install -U yt-dlp yt-dlp-ejs >/dev/null
bash termux/apagar.sh
bash termux/prender.sh
