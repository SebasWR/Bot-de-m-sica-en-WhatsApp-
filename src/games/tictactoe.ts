import { NUMBER_EMOJIS, type BoardEngine, type Level, type Outcome, type Player } from './board.js';
import { pick, type Rng } from './random.js';

type Cell = Player | null;

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
] as const;

function winnerOf(board: readonly Cell[]): Outcome {
  for (const [a, b, c] of LINES) {
    const v = board[a];
    if (v !== null && v !== undefined && v === board[b] && v === board[c]) return v;
  }
  return board.every((c) => c !== null) ? 'draw' : null;
}

/** Puntuación minimax desde el punto de vista de `me` (gana antes = mejor). */
function minimax(board: Cell[], turn: Player, me: Player, depth: number): number {
  const result = winnerOf(board);
  if (result === me) return 10 - depth;
  if (result === 'draw') return 0;
  if (result !== null) return depth - 10;
  const scores: number[] = [];
  for (let i = 0; i < 9; i++) {
    if (board[i] !== null) continue;
    board[i] = turn;
    scores.push(minimax(board, (1 - turn) as Player, me, depth + 1));
    board[i] = null;
  }
  return turn === me ? Math.max(...scores) : Math.min(...scores);
}

/** Tres en raya (tateti / gato). Casillas numeradas del 1 al 9. */
export class TicTacToe implements BoardEngine {
  readonly moveHint = 'un número del 1 al 9';
  readonly board: Cell[] = Array<Cell>(9).fill(null);

  parseMove(text: string): number | null {
    const m = /^\s*([1-9])\s*$/.exec(text);
    return m ? Number(m[1]) - 1 : null;
  }

  canPlay(move: number): boolean {
    return move >= 0 && move < 9 && this.board[move] === null && this.outcome() === null;
  }

  play(move: number, player: Player): void {
    if (!this.canPlay(move)) throw new Error(`Jugada inválida: ${move}`);
    this.board[move] = player;
  }

  outcome(): Outcome {
    return winnerOf(this.board);
  }

  free(): number[] {
    return this.board.flatMap((c, i) => (c === null ? [i] : []));
  }

  botMove(player: Player, rng: Rng, level: Level): number {
    const free = this.free();
    const randomChance = level === 'facil' ? 1 : level === 'normal' ? 0.3 : 0;
    if (rng() < randomChance) return pick(rng, free);
    let best = -Infinity;
    let bestMoves: number[] = [];
    for (const i of free) {
      this.board[i] = player;
      const score = minimax(this.board, (1 - player) as Player, player, 1);
      this.board[i] = null;
      if (score > best) {
        best = score;
        bestMoves = [i];
      } else if (score === best) {
        bestMoves.push(i);
      }
    }
    return pick(rng, bestMoves);
  }

  render(symbols: readonly [string, string]): string {
    const cell = (i: number) => {
      const v = this.board[i];
      return v === null || v === undefined ? NUMBER_EMOJIS[i]! : symbols[v];
    };
    return [0, 3, 6].map((r) => `${cell(r)}${cell(r + 1)}${cell(r + 2)}`).join('\n');
  }
}
