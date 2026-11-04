import { HANGMAN_WORDS, HANGMAN_WORDS_EN } from './data/words.js';
import type { Lang } from './lang.js';
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
  readonly label: string;
  readonly game: Hangman;
  readonly category: string;

  constructor(
    private readonly chatJid: string,
    private readonly prefix: string,
    rng: Rng,
    word?: { word: string; category: string },
    readonly lang: Lang = 'es',
  ) {
    this.label = lang === 'en' ? '🪢 Hangman (English)' : '🪢 Ahorcado';
    const bank = lang === 'en' ? HANGMAN_WORDS_EN : HANGMAN_WORDS;
    const chosen = word ?? (() => {
      const category = pick(rng, Object.keys(bank));
      return { category, word: pick(rng, bank[category]!) };
    })();
    this.game = new Hangman(chosen.word);
    this.category = chosen.category;
  }

  async onText(text: string, ctx: PlayContext, explicit: boolean): Promise<boolean> {
    const trimmed = text.trim();
    if (isLetter(trimmed)) {
      const result = this.game.guessLetter(trimmed);
      if (result === 'repeated') {
        await ctx.reply(this.t(`🔁 La *${trimmed.toUpperCase()}* ya se dijo.`, `🔁 *${trimmed.toUpperCase()}* was already said.`));
        return true;
      }
      const up = trimmed.toUpperCase();
      return this.afterGuess(ctx, result === 'hit' ? this.t('✅ ¡Bien!', '✅ Nice!') : this.t(`❌ No hay *${up}*.`, `❌ No *${up}*.`));
    }
    // Arriesgar la palabra: con el comando, o escribiéndola directamente en el chat.
    // Sin comando solo cuenta si tiene el mismo largo que la palabra, para no tomar
    // la charla normal ("jaja", "qué difícil") como intento fallido.
    const sameLength = [...trimmed].length === [...this.game.word].length;
    if (/^[\p{L}]+$/u.test(trimmed) && (explicit || sameLength)) {
      const ok = this.game.guessWord(trimmed);
      return this.afterGuess(ctx, ok ? '' : this.t(`❌ No es *${trimmed}*.`, `❌ It's not *${trimmed}*.`));
    }
    return false;
  }

  private t(es: string, en: string): string {
    return this.lang === 'en' ? en : es;
  }

  private async afterGuess(ctx: PlayContext, note: string): Promise<boolean> {
    if (this.game.solved) {
      ctx.services.games.end(this.chatJid, this);
      ctx.services.db.addGameResult(this.chatJid, ctx.senderJid, this.id, 'win');
      const w = this.game.word.toUpperCase();
      await ctx.reply(
        this.t(`🎉 ¡${tag(ctx.senderJid)} adivinó! La palabra era *${w}*.`, `🎉 ${tag(ctx.senderJid)} got it! The word was *${w}*.`),
        [ctx.senderJid],
      );
      return true;
    }
    if (this.game.lost) {
      ctx.services.games.end(this.chatJid, this);
      const w = this.game.word.toUpperCase();
      await ctx.reply(
        `${note}\n\n${STAGES[MAX_MISTAKES]} ${this.t(`¡Ahorcado! La palabra era *${w}*.`, `Hanged! The word was *${w}*.`)}`,
      );
      return true;
    }
    await ctx.reply(`${note}\n\n${this.status().text}`);
    return true;
  }

  async onQuit(ctx: PlayContext): Promise<boolean> {
    ctx.services.games.end(this.chatJid, this);
    const w = this.game.word.toUpperCase();
    await ctx.reply(this.t(`🏳️ Partida terminada. La palabra era *${w}*.`, `🏳️ Game over. The word was *${w}*.`));
    return true;
  }

  status(): { text: string } {
    const g = this.game;
    const wrong = g.wrong.length ? `\n❌ ${this.t('Fallos', 'Misses')}: ${g.wrong.map((w) => w.toUpperCase()).join(', ')}` : '';
    return {
      text:
        `${this.label} · ${this.t('Pista', 'Hint')}: _${this.category}_\n\n` +
        `\`${g.masked()}\`\n\n` +
        `${STAGES[g.mistakes]} ${this.t('Vidas', 'Lives')}: ${'❤️'.repeat(MAX_MISTAKES - g.mistakes)}${'🖤'.repeat(g.mistakes)}${wrong}\n\n` +
        this.t('Escribe una letra, o la palabra entera si ya la sabes.', 'Type a letter, or the whole word if you know it.'),
    };
  }
}
