# Bot de música en WhatsApp

Bot de WhatsApp para buscar, convertir y enviar música directamente desde el chat.

## 🚀 Puesta en marcha

### Requisitos

- Node.js 22.13 o superior (usa `node:sqlite`, que viene incluido)
- [FFmpeg](https://ffmpeg.org/) (convierte el audio a OGG/Opus)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) (busca y descarga la música)

O simplemente Docker, que ya trae todo.

### 📱 Desde el celular, sin PC (GitHub Codespaces)

Mirá [CODESPACES.md](CODESPACES.md): se abre un link, se pega un comando y aparece el código para vincular.

### Con Docker (recomendado para VPS)

```bash
cp .env.example .env          # opcional: ajusta prefijo, límites, etc.
docker compose up -d --build
docker compose logs -f bot    # aquí aparece el QR la primera vez
```

Escanea el QR desde WhatsApp → **Dispositivos vinculados → Vincular dispositivo**.
La sesión se guarda en `./auth` y la base de datos en `./data`, así que no hay que volver a escanear al reiniciar.

Sin Compose:

```bash
docker build -t whatsapp-music-bot .
docker run -d --name musicbot -v "$PWD/auth:/app/auth" -v "$PWD/data:/app/data" whatsapp-music-bot
docker logs -f musicbot
```

> YouTube cambia a menudo y las versiones viejas de yt-dlp dejan de funcionar. Si las descargas fallan, reconstruye la imagen para bajar la última versión: `docker compose build --no-cache && docker compose up -d`.

### En local

```bash
npm install
cp .env.example .env
npm run dev        # modo desarrollo con recarga automática
# o
npm run build && npm start
```

¿No puedes escanear el QR? Pon tu número en `PAIRING_NUMBER` (con código de país, sin `+`) y el bot mostrará un código de 8 caracteres para vincular con número.

## 💬 Comandos

`!ayuda` muestra todo; `!ayuda juegos` (o `!juegos`) muestra solo los juegos con sus alias.

### 🎵 Música

| Comando | Alias | Qué hace |
|---|---|---|
| `!play <canción \| URL \| número>` | `!p`, `!musica`, `!cancion` | Descarga la canción y la envía como audio OGG/Opus |
| `!buscar <texto>` | `!search`, `!s` | Muestra 5 resultados; luego `!play 2` envía el segundo |
| `!historial` | `!history`, `!h` | Tus últimas 10 canciones |
| `!top` | `!ranking` | Las canciones más pedidas |

Hay un tiempo de espera entre descargas por usuario (`COOLDOWN_SECONDS`) y una duración máxima por canción (`MAX_DURATION_SECONDS`).

### 🎮 Juegos

| Comando | Alias | Qué hace |
|---|---|---|
| `!tateti [@rival \| bot] [facil\|normal\|dificil]` | `!ttt`, `!gato`, `!3enraya` | Tres en raya. En grupo: `@rival` lo reta, `bot` juega contra el bot, sin nada es un reto abierto. En privado siempre contra el bot |
| `!4enraya [@rival \| bot] [nivel]` | `!conecta4`, `!c4` | 4 en raya (columnas 1–7), mismo sistema de retos |
| `!aceptar` / `!rechazar` | `!si` / `!no` | Acepta o rechaza un reto pendiente |
| `!ahorcado [en \| palabra]` | `!hangman` | Adivinen la palabra entre todos: una letra por mensaje, o la palabra entera directamente cuando la sepan. `!ahorcado en` = en inglés |
| `!trivia [en]` | `!pregunta`, `!quiz` | Pregunta con 4 opciones; un intento por persona, gana el primero que acierta. `!trivia en` = en inglés |
| `!emojianime [nivel]` | `!adivinaanime`, `!anime` | Adiviná el anime por los emojis: el primero que escribe el nombre gana (`pista` da una ayuda) |
| `!personaje [nivel]` | `!adivinapersonaje` | Les doy el nombre de un personaje y adivinan de qué anime es |
| `!emojijuego [nivel]` | `!adivinajuego`, `!videojuego` | Adiviná el videojuego por los emojis |
| `!adivina` | `!numero` | Número secreto del 1 al 100, 8 intentos entre todos con pistas |
| `!ppt <piedra\|papel\|tijera>` | `!rps` | Piedra, papel o tijera contra el bot |
| `!rendirse` | `!salir`, `!saltar` | Termina la partida actual del chat |
| `!puntos [juego]` | `!puntaje`, `!tabla` | Ranking de victorias del chat (todos los juegos o uno) |

**Dificultad** (`!emojianime`, `!emojijuego`, `!personaje`): `facil`, `medio`, `dificil` o `hardcore`. Va de lo más conocido a lo más de nicho; en hardcore no hay pistas y en los de emojis se muestra solo la mitad. Sin nivel, sale cualquiera.

**Cómo se juega:** después de empezar una partida se responde en el chat sin prefijo: un número para tateti, 4 en raya y adivina; una letra (o la palabra entera) para el ahorcado; `A`–`D` para la trivia. Solo hay una partida por chat y se cancela sola tras 15 minutos sin jugadas. Las victorias se guardan en SQLite por chat.

### 🎲 Diversión

| Comando | Alias | Qué hace |
|---|---|---|
| `!dado [NdM]` | `!dados`, `!d` | `!dado`, `!dado 20`, `!dado 3d6` |
| `!moneda` | `!coin`, `!flip` | Cara o cruz |
| `!bola <pregunta>` | `!8ball` | La bola mágica responde |
| `!elegir a, b o c` | `!elige` | El bot elige por ti |
| `!amor @a @b`, `!amor @a` o `!amor Ana y Juan` | `!ship`, `!love` | % de amor entre dos personas (siempre el mismo para la misma pareja) |
| `!memide [@persona]` | `!medir`, `!cm` | Los cm de 🍆 de quien escribe o de la persona etiquetada (cambia cada día) |
| `!abrazo [@persona]` | `!hug` | Manda un GIF de abrazo de anime (de [nekos.best](https://nekos.best) o [waifu.pics](https://waifu.pics)) |
| `!beso @persona` | `!kiss` | Manda un beso con un GIF de anime |

### ⚙️ General

| Comando | Alias | Qué hace |
|---|---|---|
| `!ping` | | Comprueba que el bot responde |
| `!ayuda [sección]` | `!help`, `!menu`, `!comandos`, `!juegos` | Lista de comandos |

Funciona en chats privados y en grupos.

## ⚙️ Configuración

Todas las opciones están en [`.env.example`](.env.example): prefijo de comandos, duración máxima, tiempo de espera, bitrate, enviar como nota de voz o como audio, rutas de carpetas y nivel de logs.

## 🗂️ Estructura

```text
src/
├── index.ts              # Arranque: conecta servicios y WhatsApp
├── config.ts             # Variables de entorno
├── state.ts              # Búsquedas recientes, cooldown y bloqueo por usuario
├── whatsapp/
│   ├── connection.ts     # Baileys: QR, sesión y reconexión automática
│   └── message.ts        # Extraer texto y remitente de un mensaje
├── commands/
│   ├── parser.ts         # "!play x" → { name, args, text }
│   ├── registry.ts       # Registro de comandos y alias
│   ├── handler.ts        # Ejecuta comandos, cooldown y errores
│   ├── games.ts          # Comandos de juegos (tateti, ahorcado, trivia...)
│   ├── fun.ts            # Dados, moneda, bola 8, elegir, ship, ppt
│   └── play.ts, search.ts, history.ts, help.ts, ping.ts
├── games/
│   ├── manager.ts        # Una partida activa por chat, con caducidad
│   ├── duel.ts           # Retos 1 vs 1 (o vs bot) por turnos
│   ├── tictactoe.ts      # Tablero y bot (minimax) del tateti
│   ├── connect4.ts       # Tablero y bot del 4 en raya
│   ├── hangman.ts, trivia.ts, guess.ts, fun.ts
│   └── data/             # Palabras del ahorcado y preguntas de trivia
├── services/
│   ├── music.ts          # yt-dlp: búsqueda y descarga
│   └── audio.ts          # FFmpeg: conversión a OGG/Opus
└── db/
    └── database.ts       # SQLite: usuarios, historial, puntos de juegos y ajustes
```

Para añadir un comando nuevo, crea un archivo en `src/commands/` que exporte un objeto `Command` y regístralo en `src/commands/index.ts`.

Para añadir un juego por turnos, implementa `ChatGame` (`src/games/manager.ts`): recibe los mensajes del chat con `onText` mientras la partida está activa. Los juegos de tablero 1 vs 1 solo necesitan un `BoardEngine` y se reutiliza `DuelGame`. Para más preguntas de trivia o palabras del ahorcado, edita `src/games/data/`.

## 🧪 Pruebas

```bash
npm test         # pruebas de comandos, juegos, base de datos y conversión con FFmpeg
npm run typecheck
```

---

## 🧩 Skills y conocimientos utilizados

Para desarrollar y mantener este proyecto se requieren conocimientos en las siguientes áreas:

### 🟢 Node.js / JavaScript / TypeScript

Utilizado para crear la lógica del bot, manejar eventos de WhatsApp, comandos y servicios internos.

Funciones principales:

- Gestión de mensajes.
- Sistema de comandos.
- Manejo de usuarios.
- Comunicación entre módulos.

---

### 🟣 Git y GitHub

Control de versiones del proyecto.

Permite:

- Guardar cambios.
- Trabajar con ramas.
- Gestionar versiones.
- Documentar el desarrollo.

---

### 🐳 Docker

Usado para empaquetar y ejecutar el bot en diferentes entornos.

Permite:

- Crear contenedores.
- Facilitar instalaciones.
- Ejecutar el bot en servidores VPS.
- Mantener un entorno estable.

Ejemplo:

```bash
docker build -t whatsapp-music-bot .
docker run -d whatsapp-music-bot
```

---

### 🐧 Linux / Bash

Necesario para administrar el servidor donde funcionará el bot.

Conocimientos utilizados:

- Instalación de dependencias.
- Administración de procesos.
- Permisos.
- Automatización mediante scripts.

---

### 🔌 APIs e Integraciones

Permite conectar el bot con diferentes servicios:

- WhatsApp mediante Baileys o WhatsApp Cloud API.
- Servicios de búsqueda musical.
- Servicios externos.
- Sistemas de almacenamiento.

---

### 🎧 FFmpeg y procesamiento multimedia

Utilizado para trabajar con archivos de audio.

Funciones:

- Conversión de formatos.
- Compresión de archivos.
- Optimización de audio para WhatsApp.

Ejemplo:

```text
MP3 → OGG/Opus
```

---

### 🗄️ Base de datos

Para almacenar información del bot.

Opciones:

#### SQLite

Recomendado para iniciar:

- Usuarios.
- Historial.
- Configuración.
- Canciones recientes.

#### MongoDB

Para proyectos más grandes:

- Muchos usuarios.
- Datos distribuidos.
- Escalabilidad.

---

### 🧪 Testing y Debugging

Utilizado para detectar y solucionar errores.

Incluye:

- Logs del sistema.
- Pruebas de comandos.
- Revisión de conexiones.
- Monitoreo del bot.

---

## 🛠️ Stack recomendado para este proyecto

```text
Node.js + TypeScript
        │
        ▼
      Baileys
        │
        ▼
      FFmpeg
        │
        ▼
      SQLite
        │
        ▼
      Docker
        │
        ▼
  Linux / VPS Server
```

Esta combinación permite crear un bot estable, escalable y fácil de mantener.
