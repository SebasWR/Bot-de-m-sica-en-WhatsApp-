#!/usr/bin/env bash
# Se corre sola una vez cuando se crea el Codespace: instala ffmpeg, yt-dlp y las dependencias.
set -e
sudo apt-get update -y
sudo apt-get install -y --no-install-recommends ffmpeg tmux
sudo curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
npm ci
echo "✅ Listo. Para prender el bot: bash .devcontainer/prender.sh TU_NUMERO"
