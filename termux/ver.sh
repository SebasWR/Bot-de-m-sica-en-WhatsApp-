#!/data/data/com.termux/files/usr/bin/bash
# Muestra la consola del bot (código de vinculación, errores…).
# Para salir SIN apagarlo: Ctrl+B y después D.
if tmux has-session -t bot 2>/dev/null; then
  exec tmux attach -t bot
else
  echo "El bot no está prendido. Prendelo con: bash $(cd "$(dirname "$0")" && pwd)/prender.sh"
  sleep 3
fi
