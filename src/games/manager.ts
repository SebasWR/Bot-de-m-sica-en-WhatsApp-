import type { CommandContext } from '../commands/types.js';
import type { Rng } from './random.js';

/** Lo mínimo que un juego necesita para responder en el chat. */
export type PlayContext = Pick<CommandContext, 'chatJid' | 'senderJid' | 'senderName' | 'services' | 'reply' | 'react'>;

/** Una partida que vive en un chat y recibe los mensajes que se escriben en él. */
export interface ChatGame {
  /** Identificador corto, p. ej. "tateti". También se usa para guardar puntos. */
  readonly id: string;
  /** Nombre para mostrar, p. ej. "❌⭕ Tateti". */
  readonly label: string;
  /**
   * Texto escrito en el chat mientras la partida está activa.
   * `explicit` es true cuando llega con el comando (p. ej. "!tateti 5")
   * y false cuando es un mensaje normal ("5").
   * Devuelve true si el juego usó el mensaje.
   */
  onText(text: string, ctx: PlayContext, explicit: boolean): Promise<boolean>;
  /** !rendirse. Devuelve true si la partida terminó. */
  onQuit(ctx: PlayContext): Promise<boolean>;
  /** Recordatorio del estado actual (tablero, pregunta, palabra...). */
  status(): { text: string; mentions?: string[] };
  /** !aceptar / !rechazar para juegos de dos personas. */
  onAccept?(ctx: PlayContext): Promise<void>;
  onDecline?(ctx: PlayContext): Promise<void>;
}

const DEFAULT_TTL_MS = 15 * 60_000;

/**
 * Guarda una partida activa por chat (en memoria). Las partidas abandonadas
 * caducan solas tras un rato sin actividad.
 */
export class GameManager {
  private readonly games = new Map<string, { game: ChatGame; lastActivity: number }>();

  constructor(
    readonly random: Rng = Math.random,
    private readonly now: () => number = Date.now,
    private readonly ttlMs = DEFAULT_TTL_MS,
  ) {}

  active(chatJid: string): ChatGame | undefined {
    const entry = this.games.get(chatJid);
    if (!entry) return undefined;
    if (this.now() - entry.lastActivity > this.ttlMs) {
      this.games.delete(chatJid);
      return undefined;
    }
    return entry.game;
  }

  start(chatJid: string, game: ChatGame): void {
    this.games.set(chatJid, { game, lastActivity: this.now() });
  }

  touch(chatJid: string): void {
    const entry = this.games.get(chatJid);
    if (entry) entry.lastActivity = this.now();
  }

  /** Termina la partida del chat (solo si sigue siendo `game`, cuando se indica). */
  end(chatJid: string, game?: ChatGame): void {
    const entry = this.games.get(chatJid);
    if (entry && (!game || entry.game === game)) this.games.delete(chatJid);
  }
}
