#!/data/data/com.termux/files/usr/bin/bash
# Apaga el bot.
if tmux has-session -t bot 2>/dev/null; then
  tmux kill-session -t bot
  echo "🛑 Bot apagado."
  command -v termux-toast >/dev/null && termux-toast "🛑 Bot apagado"
else
  echo "El bot no estaba prendido."
fi
command -v termux-wake-unlock >/dev/null && termux-wake-unlock
exit 0
