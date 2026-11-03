import { NUMBER_EMOJIS, type BoardEngine, type Level, type Outcome, type Player } from './board.js';
import { pick, type Rng } from './random.js';

export const COLS = 7;
export const ROWS = 6;
const EMPTY = '⚪';

/** 4 en raya: se elige una columna (1–7) y la ficha cae hasta abajo. */
export class ConnectFour implements BoardEngine {
  readonly moveHint = 'el número de columna (1 a 7)';
  /** grid[fila][columna], fila 0 = arriba. */
  readonly grid: (Player | null)[][] = Array.from({ length: ROWS }, () => Array<Player | null>(COLS).fill(null));

  parseMove(text: string): number | null {
    const m = /^\s*([1-7])\s*$/.exec(text);
    return m ? Number(m[1]) - 1 : null;
  }

  canPlay(col: number): boolean {
    return col >= 0 && col < COLS && this.grid[0]![col] === null && this.outcome() === null;
  }

  /** Devuelve la fila donde cayó la ficha. */
  play(col: number, player: Player): number {
    if (!this.canPlay(col)) throw new Error(`Columna inválida: ${col}`);
    const row = this.dropRow(col)!;
    this.grid[row]![col] = player;
    return row;
  }

  private dropRow(col: number): number | null {
    for (let r = ROWS - 1; r >= 0; r--) if (this.grid[r]![col] === null) return r;
    return null;
  }

  private at(r: number, c: number): Player | null | undefined {
    return this.grid[r]?.[c];
  }

  outcome(): Outcome {
    const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]] as const;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const v = this.at(r, c);
        if (v === null || v === undefined) continue;
        for (const [dr, dc] of dirs) {
          if ([1, 2, 3].every((k) => this.at(r + dr * k, c + dc * k) === v)) return v;
        }
      }
    }
    return this.grid[0]!.every((v) => v !== null) ? 'draw' : null;
  }

  validMoves(): number[] {
    return [...Array(COLS).keys()].filter((c) => this.grid[0]![c] === null);
  }

  /** ¿Ganaría `player` si juega en `col`? (sin modificar el tablero) */
  private wins(col: number, player: Player): boolean {
    const row = this.dropRow(col);
    if (row === null) return false;
    this.grid[row]![col] = player;
    const won = this.outcome() === player;
    this.grid[row]![col] = null;
    return won;
  }

  botMove(player: Player, rng: Rng, level: Level): number {
    const moves = this.validMoves();
    if (level === 'facil') return pick(rng, moves);
    const rival = (1 - player) as Player;

    const winning = moves.find((c) => this.wins(c, player));
    if (winning !== undefined) return winning;
    const block = moves.find((c) => this.wins(c, rival));
    if (block !== undefined) return block;

    // Evita jugadas que dejan al rival ganar justo encima.
    const safe = moves.filter((c) => {
      const row = this.dropRow(c)!;
      this.grid[row]![c] = player;
      const givesWin = this.validMoves().some((rc) => this.wins(rc, rival));
      this.grid[row]![c] = null;
      return !givesWin;
    });
    const candidates = safe.length > 0 ? safe : moves;
    if (level === 'normal' && rng() < 0.25) return pick(rng, candidates);
    // Prefiere el centro: más líneas posibles.
    const score = (c: number) => 3 - Math.abs(3 - c) + rng() * 0.5;
    return candidates.reduce((a, b) => (score(b) > score(a) ? b : a));
  }

  render(symbols: readonly [string, string]): string {
    const header = NUMBER_EMOJIS.slice(0, COLS).join('');
    const rows = this.grid.map((row) => row.map((v) => (v === null ? EMPTY : symbols[v])).join(''));
    return [header, ...rows].join('\n');
  }
}
