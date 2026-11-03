# Bot de música en WhatsApp

Bot de WhatsApp para buscar, convertir y enviar música directamente desde el chat.

## 🚀 Puesta en marcha

### Requisitos

- Node.js 22 o superior
- [FFmpeg](https://ffmpeg.org/) (convierte el audio a OGG/Opus)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) (busca y descarga la música)

O simplemente Docker, que ya trae todo.

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

| Comando | Alias | Qué hace |
|---|---|---|
| `!play <canción \| URL \| número>` | `!p`, `!musica`, `!cancion` | Descarga la canción y la envía como audio OGG/Opus |
| `!buscar <texto>` | `!search`, `!s` | Muestra 5 resultados; luego `!play 2` envía el segundo |
| `!historial` | `!history`, `!h` | Tus últimas 10 canciones |
| `!top` | `!ranking` | Las canciones más pedidas |
| `!ping` | | Comprueba que el bot responde |
| `!ayuda` | `!help`, `!menu` | Lista de comandos |

Funciona en chats privados y en grupos. Hay un tiempo de espera entre descargas por usuario (`COOLDOWN_SECONDS`) y una duración máxima por canción (`MAX_DURATION_SECONDS`).

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
│   └── play.ts, search.ts, history.ts, help.ts, ping.ts
├── services/
│   ├── music.ts          # yt-dlp: búsqueda y descarga
│   └── audio.ts          # FFmpeg: conversión a OGG/Opus
└── db/
    └── database.ts       # SQLite: usuarios, historial y ajustes
```

Para añadir un comando nuevo, crea un archivo en `src/commands/` que exporte un objeto `Command` y regístralo en `src/commands/index.ts`.

## 🧪 Pruebas

```bash
npm test         # pruebas de comandos, base de datos y conversión con FFmpeg
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
