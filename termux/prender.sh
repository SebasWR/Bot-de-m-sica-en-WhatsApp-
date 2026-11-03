#!/data/data/com.termux/files/usr/bin/bash
# Prende el bot en segundo plano (sesión tmux "bot").
DIR="$(cd "$(dirname "$0")/.." && pwd)"
if tmux has-session -t bot 2>/dev/null; then
  echo "El bot ya está prendido. Para verlo: bash $DIR/termux/ver.sh"
  command -v termux-toast >/dev/null && termux-toast "El bot ya estaba prendido"
  exit 0
fi
tmux new-session -d -s bot "bash '$DIR/termux/correr.sh' 2>&1 | tee -a '$DIR/bot.log'"
echo "✅ Bot prendido. Para ver lo que hace: bash $DIR/termux/ver.sh"
command -v termux-toast >/dev/null && termux-toast "🎵 Bot prendido"
exit 0
