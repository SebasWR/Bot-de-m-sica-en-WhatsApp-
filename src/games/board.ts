import type { Rng } from './random.js';

export type Player = 0 | 1;
export type Level = 'facil' | 'normal' | 'dificil';
export type Outcome = Player | 'draw' | null;

/** Reglas de un juego de tablero por turnos para dos jugadores. */
export interface BoardEngine {
  /** Cómo se indica una jugada, para los mensajes de ayuda. */
  readonly moveHint: string;
  /** "5" → 4. Devuelve null si el texto no es una jugada. */
  parseMove(text: string): number | null;
  canPlay(move: number): boolean;
  play(move: number, player: Player): void;
  outcome(): Outcome;
  botMove(player: Player, rng: Rng, level: Level): number;
  render(symbols: readonly [string, string]): string;
}

export const NUMBER_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'] as const;

export function parseLevel(text: string | undefined): Level | null {
  switch (text?.toLowerCase()) {
    case 'facil':
    case 'fácil':
    case 'easy':
      return 'facil';
    case 'normal':
    case 'medio':
      return 'normal';
    case 'dificil':
    case 'difícil':
    case 'hard':
    case 'imposible':
      return 'dificil';
    default:
      return null;
  }
}
