import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { run } from '../utils/process.js';

/**
 * Argumentos de FFmpeg para convertir cualquier audio a OGG/Opus,
 * el formato nativo de las notas de voz y audios de WhatsApp.
 */
export function buildOpusArgs(input: string, output: string, bitrate = config.audioBitrate): string[] {
  return [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    input,
    '-vn', // sin vídeo / carátula
    '-map_metadata',
    '-1',
    '-ac',
    '2',
    '-ar',
    '48000',
    '-c:a',
    'libopus',
    '-b:a',
    bitrate,
    '-vbr',
    'on',
    '-application',
    'audio',
    output,
  ];
}

export class AudioService {
  /** Convierte un archivo a OGG/Opus y devuelve la ruta del archivo generado. */
  async toOpus(input: string): Promise<string> {
    const parsed = path.parse(input);
    const output = path.join(parsed.dir, `${parsed.name}.opus.ogg`);
    await run(config.ffmpegPath, buildOpusArgs(input, output), 5 * 60_000);
    return output;
  }

  async cleanup(...files: string[]): Promise<void> {
    await Promise.all(files.map((f) => fs.rm(f, { force: true })));
  }
}
