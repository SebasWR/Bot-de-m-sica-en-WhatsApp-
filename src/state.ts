import type { Track } from './services/music.js';

const SEARCH_TTL_MS = 10 * 60_000;

/**
 * Estado en memoria: últimas búsquedas de cada usuario (para "!play 2")
 * y control de tiempos de espera entre descargas.
 */
export class BotState {
  private readonly searches = new Map<string, { tracks: Track[]; expiresAt: number }>();
  private readonly lastUse = new Map<string, number>();
  private readonly busy = new Set<string>();

  constructor(private readonly now: () => number = Date.now) {}

  saveSearch(userJid: string, tracks: Track[]): void {
    this.searches.set(userJid, { tracks, expiresAt: this.now() + SEARCH_TTL_MS });
  }

  /** Devuelve el resultado N (empezando en 1) de la última búsqueda del usuario. */
  pickFromSearch(userJid: string, index: number): Track | undefined {
    const entry = this.searches.get(userJid);
    if (!entry) return undefined;
    if (entry.expiresAt < this.now()) {
      this.searches.delete(userJid);
      return undefined;
    }
    return entry.tracks[index - 1];
  }

  /** Segundos que faltan para que el usuario pueda volver a usar un comando pesado (0 = ya puede). */
  cooldownRemaining(userJid: string, cooldownSeconds: number): number {
    const last = this.lastUse.get(userJid);
    if (last === undefined) return 0;
    const remaining = cooldownSeconds * 1000 - (this.now() - last);
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  }

  markUsed(userJid: string): void {
    this.lastUse.set(userJid, this.now());
  }

  /** Evita que un mismo usuario lance varias descargas a la vez. */
  tryLock(userJid: string): boolean {
    if (this.busy.has(userJid)) return false;
    this.busy.add(userJid);
    return true;
  }

  unlock(userJid: string): void {
    this.busy.delete(userJid);
  }
}
