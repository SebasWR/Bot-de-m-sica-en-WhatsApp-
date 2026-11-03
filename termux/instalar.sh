#!/data/data/com.termux/files/usr/bin/bash
# Instala el bot de música en Android con Termux.
# Uso (en Termux):
#   curl -fsSL https://raw.githubusercontent.com/SebasWR/Bot-de-m-sica-en-WhatsApp-/claude/project-thread-7kisu7/termux/instalar.sh | bash
set -Eeuo pipefail
trap 'echo "❌ La instalación falló (línea $LINENO). Mandá una captura de lo de arriba."' ERR

# Todo va dentro de main para que bash lea el script entero antes de ejecutarlo (curl | bash)
main() {

REPO_URL="https://github.com/SebasWR/Bot-de-m-sica-en-WhatsApp-.git"
# Si el repo es privado, pasá un token de GitHub de solo lectura: GITHUB_TOKEN=xxx bash instalar.sh
if [ -n "${GITHUB_TOKEN:-}" ]; then
  REPO_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/SebasWR/Bot-de-m-sica-en-WhatsApp-.git"
fi
BRANCH="${BOT_BRANCH:-claude/project-thread-7kisu7}"
BOT_DIR="${BOT_DIR:-$HOME/bot-musica}"
NUMERO="${PAIRING_NUMBER:-59896570220}"

# Lo primero: dejar que la app "Bot de Música" (APK) le mande comandos a Termux
mkdir -p "$HOME/.termux"
touch "$HOME/.termux/termux.properties"
sed -i '/^[[:space:]]*allow-external-apps/d' "$HOME/.termux/termux.properties"
echo 'allow-external-apps = true' >> "$HOME/.termux/termux.properties"
termux-reload-settings 2>/dev/null || true

echo "==> Actualizando paquetes de Termux (puede tardar unos minutos)…"
# upgrade completo: si quedan librerías viejas (libc++), ffmpeg falla con "CANNOT LINK EXECUTABLE"
pkg upgrade -y -o Dpkg::Options::="--force-confnew" </dev/null || true
pkg install -y -o Dpkg::Options::="--force-confnew" </dev/null nodejs-lts git ffmpeg python tmux termux-api

echo "==> Instalando yt-dlp…"
pip install -U yt-dlp yt-dlp-ejs

# yt-dlp necesita un motor de JavaScript para YouTube: usamos Node, que ya está instalado
mkdir -p "$HOME/.config/yt-dlp"
grep -qs -- '--js-runtimes' "$HOME/.config/yt-dlp/config" || echo '--js-runtimes node' >> "$HOME/.config/yt-dlp/config"

echo "==> Descargando el bot en $BOT_DIR…"
if [ -d "$BOT_DIR/.git" ]; then
  git -C "$BOT_DIR" remote set-url origin "$REPO_URL"
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

# Con la app Termux:Boot, el bot se prende solo cuando se reinicia el celular
mkdir -p "$HOME/.termux/boot"
cat > "$HOME/.termux/boot/prender-bot" <<SH
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
bash "$BOT_DIR/termux/prender.sh"
SH
chmod +x "$HOME/.termux/boot/prender-bot"

echo
echo "✅ Listo. Cerrá Termux del todo (Exit en la notificación) y volvé a abrirlo para que la app funcione."
echo "   Para prender el bot desde acá:       bash ~/bot-musica/termux/prender.sh"
echo "   Para ver el código de vinculación:   bash ~/bot-musica/termux/ver.sh"
}

main "$@"
