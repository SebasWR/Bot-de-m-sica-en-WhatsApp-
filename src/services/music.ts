import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { run } from '../utils/process.js';

export interface Track {
  id: string;
  title: string;
  url: string;
  duration: number | null;
  uploader: string | null;
}

export interface DownloadedTrack {
  track: Track;
  /** Archivo de audio original descargado (formato variable: webm, m4a, mp3...). */
  file: string;
}

interface YtDlpEntry {
  id?: string;
  title?: string;
  url?: string;
  webpage_url?: string;
  duration?: number | null;
  uploader?: string | null;
  channel?: string | null;
}

const URL_PATTERN = /^https?:\/\//i;

export function isUrl(text: string): boolean {
  return URL_PATTERN.test(text.trim());
}

function toTrack(entry: YtDlpEntry): Track | null {
  if (!entry.id || !entry.title) return null;
  const url =
    entry.webpage_url ??
    (entry.url && isUrl(entry.url) ? entry.url : `https://www.youtube.com/watch?v=${entry.id}`);
  return {
    id: entry.id,
    title: entry.title,
    url,
    duration: typeof entry.duration === 'number' ? entry.duration : null,
    uploader: entry.uploader ?? entry.channel ?? null,
  };
}

/** Convierte la salida JSON-por-línea de yt-dlp en pistas. */
export function parseYtDlpLines(stdout: string): Track[] {
  const tracks: Track[] = [];
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) continue;
    try {
      const track = toTrack(JSON.parse(trimmed) as YtDlpEntry);
      if (track) tracks.push(track);
    } catch {
      // línea que no es JSON válido: se ignora
    }
  }
  return tracks;
}

/** Fuentes donde buscar: YouTube primero y SoundCloud de respaldo. */
export type Source = 'youtube' | 'soundcloud';

const SEARCH_PREFIX: Record<Source, string> = { youtube: 'ytsearch', soundcloud: 'scsearch' };

/** Error con un mensaje pensado para mostrarle al usuario en WhatsApp. */
export class MusicError extends Error {
  constructor(
    readonly userMessage: string,
    options?: { cause?: unknown },
  ) {
    super(userMessage, options);
    this.name = 'MusicError';
  }
}

/** true si yt-dlp falló porque YouTube pidió verificar que no somos un robot. */
export function isBotCheck(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /confirm you.?re not a bot|sign in to confirm|HTTP Error 429|po.?token/i.test(msg);
}

/**
 * Argumentos comunes de yt-dlp:
 * - YouTube ahora exige un motor de JavaScript: usamos el mismo Node que corre el bot.
 * - Si hay un cookies.txt (sesión de YouTube exportada), se usa para evitar el bloqueo "no soy un robot".
 */
export function ytdlpBaseArgs(cookiesFile: string | null = existingCookiesFile()): string[] {
  const args = [
    '--no-warnings',
    '--js-runtimes',
    `node:${process.execPath}`,
    '--remote-components',
    'ejs:github',
  ];
  if (cookiesFile) args.push('--cookies', cookiesFile);
  return args;
}

function existingCookiesFile(): string | null {
  return config.cookiesFile && existsSync(config.cookiesFile) ? config.cookiesFile : null;
}

/**
 * Servicio de música basado en yt-dlp: busca en YouTube (o SoundCloud si YouTube
 * no responde) y descarga el audio.
 */
export class MusicService {
  async search(query: string, limit = 5, source: Source = 'youtube'): Promise<Track[]> {
    const { stdout } = await run(
      config.ytdlpPath,
      [
        ...ytdlpBaseArgs(),
        // SoundCloud en modo "flat" no trae título/duración fiables: se extrae completo.
        ...(source === 'youtube' ? ['--flat-playlist'] : []),
        '--dump-json',
        '--',
        `${SEARCH_PREFIX[source]}${limit}:${query}`,
      ],
      90_000,
    );
    return parseYtDlpLines(stdout);
  }

  /** Busca en YouTube y, si falla o no hay nada, en SoundCloud. */
  async searchAny(query: string, limit = 5): Promise<Track[]> {
    let youtubeError: unknown = null;
    try {
      const tracks = await this.search(query, limit, 'youtube');
      if (tracks.length > 0) return tracks;
    } catch (err) {
      youtubeError = err;
      logger.warn({ err: errText(err) }, 'Búsqueda en YouTube falló, pruebo SoundCloud');
    }
    try {
      return await this.search(query, limit, 'soundcloud');
    } catch (err) {
      logger.warn({ err: errText(err) }, 'Búsqueda en SoundCloud falló');
      if (youtubeError) throw explain(youtubeError);
      return [];
    }
  }

  /** Obtiene la información de una URL concreta sin descargarla. */
  async info(url: string): Promise<Track | null> {
    try {
      const { stdout } = await run(
        config.ytdlpPath,
        [...ytdlpBaseArgs(), '--no-playlist', '--dump-json', '--', url],
        90_000,
      );
      return parseYtDlpLines(stdout)[0] ?? null;
    } catch (err) {
      throw explain(err);
    }
  }

  /** Resuelve un texto (búsqueda o URL) a una sola pista. */
  async resolve(queryOrUrl: string): Promise<Track | null> {
    if (isUrl(queryOrUrl)) return this.info(queryOrUrl);
    const [first] = await this.searchAny(queryOrUrl, 1);
    return first ?? null;
  }

  /**
   * Descarga el audio. Si YouTube bloquea la descarga, busca la misma canción
   * en SoundCloud y baja esa. Devuelve la pista que realmente se descargó.
   */
  async download(track: Track): Promise<DownloadedTrack> {
    try {
      return await this.downloadUrl(track);
    } catch (err) {
      if (/soundcloud\.com/i.test(track.url)) throw explain(err);
      logger.warn({ err: errText(err), url: track.url }, 'Descarga falló, pruebo en SoundCloud');
      let alt: Track | undefined;
      try {
        [alt] = await this.search(track.title, 1, 'soundcloud');
      } catch (scErr) {
        logger.warn({ err: errText(scErr) }, 'Búsqueda en SoundCloud falló');
      }
      if (!alt) throw explain(err);
      try {
        return await this.downloadUrl(alt);
      } catch (scErr) {
        logger.warn({ err: errText(scErr) }, 'Descarga de SoundCloud falló');
        throw explain(err);
      }
    }
  }

  private async downloadUrl(track: Track): Promise<DownloadedTrack> {
    await fs.mkdir(config.tmpDir, { recursive: true });
    const base = path.join(config.tmpDir, randomUUID());
    try {
      await run(
        config.ytdlpPath,
        [
          ...ytdlpBaseArgs(),
          '--no-playlist',
          '-f',
          'bestaudio/best',
          '--max-filesize',
          '50M',
          '-o',
          `${base}.%(ext)s`,
          '--',
          track.url,
        ],
        5 * 60_000,
      );
    } catch (err) {
      await removeByPrefix(base);
      throw err;
    }
    const dir = path.dirname(base);
    const prefix = path.basename(base);
    const file = (await fs.readdir(dir)).find((f) => f.startsWith(prefix) && !f.endsWith('.part'));
    if (!file) throw new Error('yt-dlp no generó ningún archivo');
    return { track, file: path.join(dir, file) };
  }
}

async function removeByPrefix(base: string): Promise<void> {
  const dir = path.dirname(base);
  const prefix = path.basename(base);
  const files = await fs.readdir(dir).catch(() => [] as string[]);
  await Promise.all(files.filter((f) => f.startsWith(prefix)).map((f) => fs.rm(path.join(dir, f), { force: true })));
}

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Traduce un error de yt-dlp a algo entendible para el usuario. */
export function explain(err: unknown): Error {
  if (err instanceof MusicError) return err;
  if (isBotCheck(err)) {
    return new MusicError(
      '🤖 YouTube bloqueó la descarga (pide confirmar que no soy un robot) y tampoco la encontré en SoundCloud. Probá con otro nombre o más tarde.',
      { cause: err },
    );
  }
  const msg = errText(err);
  if (/no se pudo ejecutar/i.test(msg)) {
    return new MusicError('⚙️ Falta instalar yt-dlp en el servidor del bot.', { cause: err });
  }
  if (/video unavailable|private video|not available/i.test(msg)) {
    return new MusicError('🚫 Ese video no está disponible.', { cause: err });
  }
  return err instanceof Error ? err : new Error(msg);
}
