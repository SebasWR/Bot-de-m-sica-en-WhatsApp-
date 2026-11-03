import type { ChatGame, PlayContext } from './manager.js';
import { randInt, type Rng } from './random.js';
import { tag } from './text.js';

export const GUESS_MAX = 100;
export const GUESS_ATTEMPTS = 8;

/** Adivina el número del 1 al 100 con pistas de "más alto / más bajo". Juegan todos los del chat. */
export class GuessGame implements ChatGame {
  readonly id = 'adivina';
  readonly label = '🔢 Adivina el número';
  readonly secret: number;
  private attempts = 0;
  private low = 1;
  private high = GUESS_MAX;

  constructor(
    private readonly chatJid: string,
    rng: Rng,
    secret?: number,
  ) {
    this.secret = secret ?? randInt(rng, 1, GUESS_MAX);
  }

  async onText(text: string, ctx: PlayContext): Promise<boolean> {
    const m = /^\s*(\d{1,3})\s*$/.exec(text);
    if (!m) return false;
    const n = Number(m[1]);
    if (n < 1 || n > GUESS_MAX) {
      await ctx.reply(`Tiene que ser un número del 1 al ${GUESS_MAX}.`);
      return true;
    }
    this.attempts++;

    if (n === this.secret) {
      ctx.services.games.end(this.chatJid, this);
      ctx.services.db.addGameResult(this.chatJid, ctx.senderJid, this.id, 'win');
      await ctx.reply(
        `🎯 ¡${tag(ctx.senderJid)} lo adivinó! Era el *${this.secret}* (intento ${this.attempts}/${GUESS_ATTEMPTS}).`,
        [ctx.senderJid],
      );
      return true;
    }

    if (this.attempts >= GUESS_ATTEMPTS) {
      ctx.services.games.end(this.chatJid, this);
      await ctx.reply(`💥 Se acabaron los intentos. El número era *${this.secret}*.`);
      return true;
    }

    if (n < this.secret) this.low = Math.max(this.low, n + 1);
    else this.high = Math.min(this.high, n - 1);
    const hint = n < this.secret ? '⬆️ Más alto' : '⬇️ Más bajo';
    await ctx.reply(`${hint} que ${n}. Está entre *${this.low}* y *${this.high}*. Quedan ${GUESS_ATTEMPTS - this.attempts} intentos.`);
    return true;
  }

  async onQuit(ctx: PlayContext): Promise<boolean> {
    ctx.services.games.end(this.chatJid, this);
    await ctx.reply(`🏳️ Partida terminada. El número era *${this.secret}*.`);
    return true;
  }

  status(): { text: string } {
    return {
      text:
        `${this.label}\n\nPensé un número del 1 al ${GUESS_MAX}. Tienen ${GUESS_ATTEMPTS} intentos entre todos.\n` +
        `Está entre *${this.low}* y *${this.high}*. Escribe un número.`,
    };
  }
}
