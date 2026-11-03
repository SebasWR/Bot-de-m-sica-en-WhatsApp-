import { TRIVIA_QUESTIONS, type TriviaQuestion } from './data/trivia.js';
import type { ChatGame, PlayContext } from './manager.js';
import { pick, shuffle, type Rng } from './random.js';
import { tag } from './text.js';

const LETTERS = ['A', 'B', 'C', 'D'] as const;

/**
 * Una pregunta de trivia por ronda. Cada persona tiene un intento;
 * el primero que acierta gana el punto.
 */
export class TriviaGame implements ChatGame {
  readonly id = 'trivia';
  readonly label = '🧠 Trivia';
  readonly question: TriviaQuestion;
  readonly options: string[];
  readonly correct: number;
  private readonly tried = new Set<string>();

  constructor(
    private readonly chatJid: string,
    private readonly prefix: string,
    private readonly isGroup: boolean,
    rng: Rng,
    question?: TriviaQuestion,
  ) {
    this.question = question ?? pick(rng, TRIVIA_QUESTIONS);
    this.options = shuffle(rng, this.question.options);
    this.correct = this.options.indexOf(this.question.options[0]);
  }

  /** "b", "B", "b)" → 1 */
  static parseAnswer(text: string): number | null {
    const m = /^\s*([abcd])\s*[).]?\s*$/i.exec(text);
    return m ? LETTERS.indexOf(m[1]!.toUpperCase() as (typeof LETTERS)[number]) : null;
  }

  async onText(text: string, ctx: PlayContext): Promise<boolean> {
    const answer = TriviaGame.parseAnswer(text);
    if (answer === null) return false;
    if (this.tried.has(ctx.senderJid)) {
      await ctx.reply('Ya respondiste esta pregunta 🙊');
      return true;
    }
    this.tried.add(ctx.senderJid);

    if (answer === this.correct) {
      ctx.services.games.end(this.chatJid, this);
      ctx.services.db.addGameResult(this.chatJid, ctx.senderJid, this.id, 'win');
      await ctx.react('✅');
      await ctx.reply(
        `🎉 ¡Correcto, ${tag(ctx.senderJid)}! Era *${this.correctText}*.\nOtra: *${this.prefix}trivia*`,
        [ctx.senderJid],
      );
      return true;
    }

    ctx.services.db.addGameResult(this.chatJid, ctx.senderJid, this.id, 'loss');
    await ctx.react('❌');
    if (!this.isGroup) {
      ctx.services.games.end(this.chatJid, this);
      await ctx.reply(`❌ Incorrecto. La respuesta era *${this.correctText}*.\nOtra: *${this.prefix}trivia*`);
    }
    return true;
  }

  private get correctText(): string {
    return `${LETTERS[this.correct]}) ${this.options[this.correct]}`;
  }

  async onQuit(ctx: PlayContext): Promise<boolean> {
    ctx.services.games.end(this.chatJid, this);
    await ctx.reply(`⏭️ Pregunta saltada. La respuesta era *${this.correctText}*.`);
    return true;
  }

  status(): { text: string } {
    const opts = this.options.map((o, i) => `*${LETTERS[i]})* ${o}`).join('\n');
    const rule = this.isGroup ? 'Un intento por persona, ¡el primero que acierte gana!' : 'Tienes un intento.';
    return {
      text: `${this.label} · ${this.question.category}\n\n❓ ${this.question.question}\n\n${opts}\n\nResponde con la letra (A, B, C o D). ${rule}`,
    };
  }
}
