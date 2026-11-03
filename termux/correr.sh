#!/data/data/com.termux/files/usr/bin/bash
# Corre el bot y lo reinicia solo si se cae. Lo lanza prender.sh dentro de tmux.
cd "$(dirname "$0")/.."
command -v termux-wake-lock >/dev/null && termux-wake-lock   # que Android no duerma a Termux
while true; do
  echo "[$(date '+%H:%M:%S')] Iniciando bot…"
  node --disable-warning=ExperimentalWarning --import tsx src/index.ts
  code=$?
  echo "[$(date '+%H:%M:%S')] El bot se detuvo (código $code). Reinicio en 5 segundos… (Ctrl+C para cancelar)"
  sleep 5
done
