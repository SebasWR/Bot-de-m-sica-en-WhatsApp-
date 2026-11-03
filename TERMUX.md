# 📱 Prender el bot desde el celular (Android + Termux)

Con esto el bot corre **en el propio celular**, sin PC y sin Claude Code. Lo prendés y lo apagás con un botón en la pantalla de inicio.

> El celular tiene que estar con internet y, mientras el bot esté prendido, Termux queda abierto en segundo plano. Gasta algo de batería: lo ideal es dejarlo enchufado.

## 1. Instalar las apps (una sola vez)

Bajá estas tres apps **desde F-Droid** (https://f-droid.org) — tienen que venir todas del mismo lugar, si no, no se hablan entre sí:

1. **Termux**
2. **Termux:Widget** (los botones de prender/apagar)
3. **Termux:API** (para que el aviso "Bot prendido" aparezca en pantalla)
4. **Termux:Boot** (opcional: prende el bot solo cuando se reinicia el celular). Abrila una vez después de instalarla.

Después, en Ajustes de Android → Apps → **Termux** → Batería → **Sin restricciones** (para que Android no lo mate).

## 2. Instalar el bot (una sola vez)

Abrí Termux, pegá esta línea y dale Enter:

```bash
curl -fsSL https://raw.githubusercontent.com/SebasWR/Bot-de-m-sica-en-WhatsApp-/claude/project-thread-7kisu7/termux/instalar.sh | bash
```

Tarda unos minutos (baja Node, FFmpeg, yt-dlp y el bot). Si pregunta algo, dale Enter. Al final dice **✅ Listo**.

## 3. Vincular el número del bot (una sola vez)

⚠️ Antes, **apagá el bot en la PC** si quedó prendido: dos bots con el mismo número se pisan.

```bash
bash ~/bot-musica/termux/prender.sh
bash ~/bot-musica/termux/ver.sh
```

En unos segundos aparece un **código de 8 letras**. En el celular que tiene el WhatsApp del bot (+598 96570220): WhatsApp → ⋮ → **Dispositivos vinculados** → **Vincular dispositivo** → **Vincular con número de teléfono** → escribí el código.

Cuando diga que se conectó, salí de la consola **sin apagar el bot**: `Ctrl` + `B` y después `D` (en Termux, `Ctrl` está en la barra de teclas de arriba).

## 4. Usarlo todos los días

Agregá el widget: mantené apretada la pantalla de inicio → **Widgets** → **Termux:Widget**. Aparecen tres botones:

| Botón | Qué hace |
|---|---|
| **Bot - prender** | Prende el bot en segundo plano |
| **Bot - apagar** | Lo apaga |
| **Bot - ver** | Muestra la consola (salís con `Ctrl+B`, `D`) |

Si el bot se cae, se reinicia solo. Si reiniciás el celular y tenés **Termux:Boot**, el bot se prende solo; si no, apretá **Bot - prender** (no hace falta volver a vincular).

También se puede desde Termux escribiendo `bash ~/bot-musica/termux/prender.sh` (o `apagar.sh`, `ver.sh`).

## App "Bot de Música" (APK)

En vez del widget podés usar la app: https://github.com/SebasWR/Bot-de-m-sica-en-WhatsApp-/releases/download/apk-latest/BotMusica.apk

Tiene botones para prender, apagar, ver la consola, actualizar y muestra si el bot está prendido. Por dentro usa Termux, así que igual hay que hacer los pasos 1 a 3 (la app te ayuda: copia el comando de instalación y abre Termux). Después de instalar, cerrá Termux del todo y volvé a abrirlo, y la primera vez que toques un botón aceptá el permiso.

## Actualizar el bot

```bash
bash ~/bot-musica/termux/actualizar.sh
```

Baja la última versión, actualiza yt-dlp (YouTube cambia seguido) y reinicia el bot.

## Si algo falla

- **"El bot no está prendido"** al ver: apretá *Bot - prender*.
- **Las canciones no bajan**: corré `actualizar.sh` (casi siempre es yt-dlp viejo).
- **Se apaga solo con la pantalla apagada**: revisá que Termux esté en batería "Sin restricciones". En la notificación de Termux tiene que decir *wake lock held*.
- **Hay que volver a vincular** (por ejemplo, borraste la sesión desde WhatsApp): `bash ~/bot-musica/termux/apagar.sh`, después `rm -rf ~/bot-musica/auth` y repetí el paso 3.
- El historial y los rankings se guardan en `~/bot-musica/data`. Si querés traer los de la PC, copiá el archivo `data/bot.sqlite` de la PC a esa carpeta (con el bot apagado).
