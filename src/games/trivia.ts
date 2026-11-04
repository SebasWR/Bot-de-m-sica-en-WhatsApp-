import { TRIVIA_QUESTIONS, TRIVIA_QUESTIONS_EN, type TriviaQuestion } from './data/trivia.js';
import type { Lang } from './lang.js';
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
  readonly label: string;
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
    readonly lang: Lang = 'es',
  ) {
    this.label = lang === 'en' ? '🧠 Trivia (English)' : '🧠 Trivia';
    this.question = question ?? pick(rng, lang === 'en' ? TRIVIA_QUESTIONS_EN : TRIVIA_QUESTIONS);
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
      await ctx.reply(this.t('Ya respondiste esta pregunta 🙊', 'You already answered this one 🙊'));
      return true;
    }
    this.tried.add(ctx.senderJid);

    if (answer === this.correct) {
      ctx.services.games.end(this.chatJid, this);
      ctx.services.db.addGameResult(this.chatJid, ctx.senderJid, this.id, 'win');
      await ctx.react('✅');
      await ctx.reply(
        this.t(
          `🎉 ¡Correcto, ${tag(ctx.senderJid)}! Era *${this.correctText}*.\nOtra: *${this.again}*`,
          `🎉 Correct, ${tag(ctx.senderJid)}! It was *${this.correctText}*.\nAnother one: *${this.again}*`,
        ),
        [ctx.senderJid],
      );
      return true;
    }

    ctx.services.db.addGameResult(this.chatJid, ctx.senderJid, this.id, 'loss');
    await ctx.react('❌');
    if (!this.isGroup) {
      ctx.services.games.end(this.chatJid, this);
      await ctx.reply(
        this.t(
          `❌ Incorrecto. La respuesta era *${this.correctText}*.\nOtra: *${this.again}*`,
          `❌ Wrong. The answer was *${this.correctText}*.\nAnother one: *${this.again}*`,
        ),
      );
    }
    return true;
  }

  private t(es: string, en: string): string {
    return this.lang === 'en' ? en : es;
  }

  private get again(): string {
    return `${this.prefix}trivia${this.lang === 'en' ? ' en' : ''}`;
  }

  private get correctText(): string {
    return `${LETTERS[this.correct]}) ${this.options[this.correct]}`;
  }

  async onQuit(ctx: PlayContext): Promise<boolean> {
    ctx.services.games.end(this.chatJid, this);
    await ctx.reply(
      this.t(`⏭️ Pregunta saltada. La respuesta era *${this.correctText}*.`, `⏭️ Skipped. The answer was *${this.correctText}*.`),
    );
    return true;
  }

  status(): { text: string } {
    const opts = this.options.map((o, i) => `*${LETTERS[i]})* ${o}`).join('\n');
    const rule = this.isGroup
      ? this.t('Un intento por persona, ¡el primero que acierte gana!', 'One try each, first correct answer wins!')
      : this.t('Tienes un intento.', 'You have one try.');
    const answerWith = this.t('Responde con la letra (A, B, C o D).', 'Answer with the letter (A, B, C or D).');
    return {
      text: `${this.label} · ${this.question.category}\n\n❓ ${this.question.question}\n\n${opts}\n\n${answerWith} ${rule}`,
    };
  }
}
