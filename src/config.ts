import 'dotenv/config';
import path from 'node:path';

function str(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value.trim() === '' ? fallback : value.trim();
}

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new Error(`La variable ${name} debe ser un número entero positivo (valor: "${raw}")`);
  }
  return parsed;
}

function bool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  return ['1', 'true', 'yes', 'si', 'sí'].includes(raw.trim().toLowerCase());
}

export const config = {
  prefix: str('PREFIX', '!'),
  botName: str('BOT_NAME', 'MusicBot'),
  authDir: path.resolve(str('AUTH_DIR', './auth')),
  dataDir: path.resolve(str('DATA_DIR', './data')),
  tmpDir: path.resolve(str('TMP_DIR', './tmp')),
  maxDurationSeconds: int('MAX_DURATION_SECONDS', 600),
  cooldownSeconds: int('COOLDOWN_SECONDS', 15),
  sendAsVoiceNote: bool('SEND_AS_VOICE_NOTE', false),
  audioBitrate: str('AUDIO_BITRATE', '96k'),
  ytdlpPath: str('YTDLP_PATH', 'yt-dlp'),
  ffmpegPath: str('FFMPEG_PATH', 'ffmpeg'),
  /** Cookies de YouTube (formato Netscape). Opcional: se usa solo si el archivo existe. */
  cookiesFile: path.resolve(str('COOKIES_FILE', './cookies.txt')),
  logLevel: str('LOG_LEVEL', 'info'),
  pairingNumber: str('PAIRING_NUMBER', '').replace(/\D/g, ''),
} as const;

export type Config = typeof config;
