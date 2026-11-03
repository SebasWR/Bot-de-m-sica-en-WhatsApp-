import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { run } from '../utils/process.js';

/** Acciones de anime disponibles (nombres de las APIs). */
export type AnimeAction = 'hug' | 'kiss';

interface GifSource {
  name: string;
  url(action: AnimeAction): string;
  /** Saca la URL del GIF de la respuesta JSON de la API. */
  pick(json: unknown): string | null;
}

/** APIs gratuitas sin clave. Se prueban en orden hasta que una responda. */
export const GIF_SOURCES: GifSource[] = [
  {
    name: 'nekos.best',
    url: (a) => `https://nekos.best/api/v2/${a}`,
    pick: (json) => {
      const results = (json as { results?: { url?: unknown }[] })?.results;
      const url = results?.[0]?.url;
      return typeof url === 'string' ? url : null;
    },
  },
  {
    name: 'waifu.pics',
    url: (a) => `https://api.waifu.pics/sfw/${a}`,
    pick: (json) => {
      const url = (json as { url?: unknown })?.url;
      return typeof url === 'string' ? url : null;
    },
  },
];

/**
 * WhatsApp no reproduce GIF animados: hay que mandarlos como MP4 con `gifPlayback`.
 * Dimensiones pares y yuv420p para que lo reproduzcan Android y iPhone.
 */
export function buildGifToMp4Args(input: string, output: string): string[] {
  return [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', input,
    '-movflags', 'faststart',
    '-pix_fmt', 'yuv420p',
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    '-an',
    '-c:v', 'libx264',
    output,
  ];
}

export class GifService {
  constructor(
    private readonly fetchFn: typeof fetch = fetch,
    private readonly sources: GifSource[] = GIF_SOURCES,
  ) {}

  /** URL de un GIF aleatorio para la acción, o null si ninguna API respondió. */
  async randomGifUrl(action: AnimeAction): Promise<string | null> {
    for (const source of this.sources) {
      try {
        const res = await this.fetchFn(source.url(action), { signal: AbortSignal.timeout(10_000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const url = source.pick(await res.json());
        if (url) return url;
      } catch (err) {
        logger.warn({ err, source: source.name }, 'API de GIFs no disponible');
      }
    }
    return null;
  }

  /** Descarga un GIF aleatorio y lo convierte a MP4. Devuelve la ruta (hay que borrarla después). */
  async randomGifMp4(action: AnimeAction): Promise<string | null> {
    const url = await this.randomGifUrl(action);
    if (!url) return null;
    const res = await this.fetchFn(url, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return null;
    await fs.mkdir(config.tmpDir, { recursive: true });
    const base = path.join(config.tmpDir, `gif-${randomUUID()}`);
    const gif = `${base}.gif`;
    const mp4 = `${base}.mp4`;
    await fs.writeFile(gif, Buffer.from(await res.arrayBuffer()));
    try {
      await run(config.ffmpegPath, buildGifToMp4Args(gif, mp4), 60_000);
    } finally {
      await fs.rm(gif, { force: true });
    }
    return mp4;
  }
}
