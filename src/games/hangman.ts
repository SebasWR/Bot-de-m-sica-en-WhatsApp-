import { HANGMAN_WORDS } from './data/words.js';
import type { ChatGame, PlayContext } from './manager.js';
import { pick, type Rng } from './random.js';
import { fold, tag } from './text.js';

export const MAX_MISTAKES = 6;

const STAGES = [
  '😀', '😐', '😕', '😟', '😨', '😱', '💀',
] as const;

/** Lógica pura del ahorcado (sin WhatsApp). */
export class Hangman {
  readonly guessed = new Set<string>();
  readonly wrong: string[] = [];
  private readonly folded: string;

  constructor(readonly word: string) {
    this.folded = fold(word);
  }

  /** Intenta una letra. 'repeated' si ya se había dicho. */
  guessLetter(raw: string): 'hit' | 'miss' | 'repeated' {
    const letter = fold(raw);
    if (this.guessed.has(letter) || this.wrong.includes(letter)) return 'repeated';
    if (this.folded.includes(letter)) {
      this.guessed.add(letter);
      return 'hit';
    }
    this.wrong.push(letter);
    return 'miss';
  }

  /** Arriesga la palabra completa: si falla cuenta como error. */
  guessWord(raw: string): boolean {
    if (fold(raw.trim()) === this.folded) {
      for (const ch of this.folded) this.guessed.add(ch);
      return true;
    }
    this.wrong.push(raw.trim().toLowerCase());
    return false;
  }

  get mistakes(): number {
    return this.wrong.length;
  }

  get solved(): boolean {
    return [...this.folded].every((ch) => this.guessed.has(ch));
  }

  get lost(): boolean {
    return this.mistakes >= MAX_MISTAKES;
  }

  masked(): string {
    return [...this.word].map((ch, i) => (this.guessed.has(this.folded[i]!) ? ch.toUpperCase() : '_')).join(' ');
  }
}

export function isLetter(text: string): boolean {
  return /^[a-zA-ZñÑáéíóúüÁÉÍÓÚÜ]$/.test(text.trim());
}

export class HangmanGame implements ChatGame {
  readonly id = 'ahorcado';
  readonly label = '🪢 Ahorcado';
  readonly game: Hangman;
  readonly category: string;

  constructor(
    private readonly chatJid: string,
    private readonly prefix: string,
    rng: Rng,
    word?: { word: string; category: string },
  ) {
    const chosen = word ?? (() => {
      const category = pick(rng, Object.keys(HANGMAN_WORDS));
      return { category, word: pick(rng, HANGMAN_WORDS[category]!) };
    })();
    this.game = new Hangman(chosen.word);
    this.category = chosen.category;
  }

  async onText(text: string, ctx: PlayContext, explicit: boolean): Promise<boolean> {
    const trimmed = text.trim();
    if (isLetter(trimmed)) {
      const result = this.game.guessLetter(trimmed);
      if (result === 'repeated') {
        await ctx.reply(`🔁 La *${trimmed.toUpperCase()}* ya se dijo.`);
        return true;
      }
      return this.afterGuess(ctx, result === 'hit' ? '✅ ¡Bien!' : `❌ No hay *${trimmed.toUpperCase()}*.`);
    }
    // Arriesgar palabra solo con el comando, para no contar charla normal como intento.
    if (explicit && /^[\p{L}]+$/u.test(trimmed)) {
      const ok = this.game.guessWord(trimmed);
      return this.afterGuess(ctx, ok ? '' : `❌ No es *${trimmed}*.`);
    }
    return false;
  }

  private async afterGuess(ctx: PlayContext, note: string): Promise<boolean> {
    if (this.game.solved) {
      ctx.services.games.end(this.chatJid, this);
      ctx.services.db.addGameResult(this.chatJid, ctx.senderJid, this.id, 'win');
      await ctx.reply(`🎉 ¡${tag(ctx.senderJid)} adivinó! La palabra era *${this.game.word.toUpperCase()}*.`, [ctx.senderJid]);
      return true;
    }
    if (this.game.lost) {
      ctx.services.games.end(this.chatJid, this);
      await ctx.reply(`${note}\n\n${STAGES[MAX_MISTAKES]} ¡Ahorcado! La palabra era *${this.game.word.toUpperCase()}*.`);
      return true;
    }
    await ctx.reply(`${note}\n\n${this.status().text}`);
    return true;
  }

  async onQuit(ctx: PlayContext): Promise<boolean> {
    ctx.services.games.end(this.chatJid, this);
    await ctx.reply(`🏳️ Partida terminada. La palabra era *${this.game.word.toUpperCase()}*.`);
    return true;
  }

  status(): { text: string } {
    const g = this.game;
    const wrong = g.wrong.length ? `\n❌ Fallos: ${g.wrong.map((w) => w.toUpperCase()).join(', ')}` : '';
    return {
      text:
        `${this.label} · Pista: _${this.category}_\n\n` +
        `\`${g.masked()}\`\n\n` +
        `${STAGES[g.mistakes]} Vidas: ${'❤️'.repeat(MAX_MISTAKES - g.mistakes)}${'🖤'.repeat(g.mistakes)}${wrong}\n\n` +
        `Escribe una letra, o *${this.prefix}ahorcado <palabra>* para arriesgar.`,
    };
  }
}
