#!/data/data/com.termux/files/usr/bin/bash
# Instala el bot de música en Android con Termux.
# Uso (en Termux):
#   curl -fsSL https://raw.githubusercontent.com/SebasWR/Bot-de-m-sica-en-WhatsApp-/claude/project-thread-7kisu7/termux/instalar.sh | bash
set -euo pipefail

REPO_URL="https://github.com/SebasWR/Bot-de-m-sica-en-WhatsApp-.git"
BRANCH="${BOT_BRANCH:-claude/project-thread-7kisu7}"
BOT_DIR="${BOT_DIR:-$HOME/bot-musica}"
NUMERO="${PAIRING_NUMBER:-59896570220}"

echo "==> Actualizando paquetes de Termux (puede tardar unos minutos)…"
yes | pkg update -y || true
pkg install -y nodejs-lts git ffmpeg python tmux termux-api

echo "==> Instalando yt-dlp…"
pip install -U yt-dlp yt-dlp-ejs

# yt-dlp necesita un motor de JavaScript para YouTube: usamos Node, que ya está instalado
mkdir -p "$HOME/.config/yt-dlp"
grep -qs -- '--js-runtimes' "$HOME/.config/yt-dlp/config" || echo '--js-runtimes node' >> "$HOME/.config/yt-dlp/config"

echo "==> Descargando el bot en $BOT_DIR…"
if [ -d "$BOT_DIR/.git" ]; then
  git -C "$BOT_DIR" fetch origin "$BRANCH"
  git -C "$BOT_DIR" checkout -B "$BRANCH" "origin/$BRANCH"
else
  git clone -b "$BRANCH" "$REPO_URL" "$BOT_DIR"
fi
cd "$BOT_DIR"

echo "==> Instalando dependencias de Node…"
# --ignore-scripts / --omit=peer: evita paquetes nativos (sharp) que no compilan en Android
npm ci --ignore-scripts --omit=peer --no-audit --no-fund

if [ ! -f .env ]; then
  cp .env.example .env
  sed -i "s/^PAIRING_NUMBER=.*/PAIRING_NUMBER=$NUMERO/" .env
  echo "==> Creado .env (número para vincular: $NUMERO)"
fi

echo "==> Creando accesos directos para el widget de Termux…"
mkdir -p "$HOME/.shortcuts"
for s in prender apagar ver; do
  cat > "$HOME/.shortcuts/Bot - $s" <<SH
#!/data/data/com.termux/files/usr/bin/bash
bash "$BOT_DIR/termux/$s.sh"
SH
  chmod +x "$HOME/.shortcuts/Bot - $s"
done
chmod +x termux/*.sh

echo
echo "✅ Listo. Para prender el bot escribí:   bash ~/bot-musica/termux/prender.sh"
echo "   Para ver el código de vinculación:   bash ~/bot-musica/termux/ver.sh"
