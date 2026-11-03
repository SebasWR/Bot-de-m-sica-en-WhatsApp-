import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
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

/**
 * Servicio de música basado en yt-dlp: busca en YouTube y descarga el audio.
 */
export class MusicService {
  async search(query: string, limit = 5): Promise<Track[]> {
    const { stdout } = await run(
      config.ytdlpPath,
      ['--flat-playlist', '--dump-json', '--no-warnings', '--', `ytsearch${limit}:${query}`],
      60_000,
    );
    return parseYtDlpLines(stdout);
  }

  /** Obtiene la información de una URL concreta sin descargarla. */
  async info(url: string): Promise<Track | null> {
    const { stdout } = await run(
      config.ytdlpPath,
      ['--no-playlist', '--dump-json', '--no-warnings', '--', url],
      60_000,
    );
    return parseYtDlpLines(stdout)[0] ?? null;
  }

  /** Resuelve un texto (búsqueda o URL) a una sola pista. */
  async resolve(queryOrUrl: string): Promise<Track | null> {
    if (isUrl(queryOrUrl)) return this.info(queryOrUrl);
    const [first] = await this.search(queryOrUrl, 1);
    return first ?? null;
  }

  async download(track: Track): Promise<DownloadedTrack> {
    await fs.mkdir(config.tmpDir, { recursive: true });
    const base = path.join(config.tmpDir, randomUUID());
    await run(
      config.ytdlpPath,
      [
        '--no-playlist',
        '--no-warnings',
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
    const dir = path.dirname(base);
    const prefix = path.basename(base);
    const file = (await fs.readdir(dir)).find((f) => f.startsWith(prefix));
    if (!file) throw new Error('yt-dlp no generó ningún archivo');
    return { track, file: path.join(dir, file) };
  }
}
