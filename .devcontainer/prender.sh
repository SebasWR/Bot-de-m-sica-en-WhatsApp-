#!/usr/bin/env bash
# Prende el bot en el Codespace. Uso: bash .devcontainer/prender.sh 59896570220
# (la primera vez con el número del bot; después alcanza con: bash .devcontainer/prender.sh)
cd "$(dirname "$0")/.."
if [ -n "$1" ]; then
  num="$(echo "$1" | tr -cd '0-9')"
  touch .env
  grep -v '^PAIRING_NUMBER=' .env > .env.tmp || true
  echo "PAIRING_NUMBER=$num" >> .env.tmp && mv .env.tmp .env
fi
if ! grep -q '^PAIRING_NUMBER=[0-9]' .env 2>/dev/null && [ ! -f auth/creds.json ]; then
  echo "Falta el número. Escribí: bash .devcontainer/prender.sh 598XXXXXXXX"
  exit 1
fi
command -v yt-dlp >/dev/null || bash .devcontainer/preparar.sh
# YouTube cambia seguido: actualizar yt-dlp en cada arranque.
echo "Actualizando yt-dlp…"
sudo yt-dlp -U >/dev/null 2>&1 || true
tmux kill-session -t bot 2>/dev/null || true
tmux new-session -d -s bot "while true; do node --disable-warning=ExperimentalWarning --import tsx src/index.ts; echo 'Reinicio en 5 s…'; sleep 5; done 2>&1 | tee -a bot.log"
echo "✅ Bot prendido. Mirá el código abajo (para salir de esta vista sin apagarlo: Ctrl+B y después D)."
sleep 2
exec tmux attach -t bot
