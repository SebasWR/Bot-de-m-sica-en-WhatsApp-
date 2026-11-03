import type { BoardEngine, Level, Player } from './board.js';
import type { ChatGame, PlayContext } from './manager.js';
import type { Rng } from './random.js';
import { tag } from './text.js';

export const BOT = 'bot';

export interface DuelOptions {
  id: string;
  label: string;
  engine: BoardEngine;
  symbols: readonly [string, string];
  chatJid: string;
  prefix: string;
  rng: Rng;
  challenger: string;
  /** Rival concreto, `BOT`, o null para un reto abierto (cualquiera puede aceptar). */
  opponent: string | null;
  level?: Level;
}

/**
 * Partida por turnos entre dos personas (o contra el bot) sobre un `BoardEngine`.
 * Flujo: reto → !aceptar → jugadas por turnos → resultado.
 */
export class DuelGame implements ChatGame {
  readonly id: string;
  readonly label: string;
  private phase: 'waiting' | 'playing' | 'over' = 'waiting';
  private players: [string, string] = ['', ''];
  private turn: Player = 0;
  private readonly level: Level;

  constructor(private readonly opts: DuelOptions) {
    this.id = opts.id;
    this.label = opts.label;
    this.level = opts.level ?? 'normal';
  }

  get vsBot(): boolean {
    return this.opts.opponent === BOT;
  }

  /** Anuncia el reto, o empieza directamente si es contra el bot. */
  async begin(ctx: PlayContext): Promise<void> {
    const { prefix, challenger, opponent } = this.opts;
    if (opponent === BOT) {
      await this.startMatch(ctx, challenger, BOT);
      return;
    }
    if (opponent) {
      await ctx.reply(
        `${this.label}\n\n${tag(challenger)} reta a ${tag(opponent)} 🔥\n` +
          `${tag(opponent)}, escribe *${prefix}aceptar* para jugar o *${prefix}rechazar*.`,
        [challenger, opponent],
      );
    } else {
      await ctx.reply(
        `${this.label}\n\n${tag(challenger)} busca rival 🔥\nEl primero que escriba *${prefix}aceptar* juega.`,
        [challenger],
      );
    }
  }

  async onAccept(ctx: PlayContext): Promise<void> {
    const { challenger, opponent } = this.opts;
    if (this.phase !== 'waiting') {
      await ctx.reply('La partida ya está en marcha.');
      return;
    }
    if (ctx.senderJid === challenger) {
      await ctx.reply('No puedes aceptar tu propio reto 😅');
      return;
    }
    if (opponent && opponent !== ctx.senderJid) {
      await ctx.reply(`Este reto es para ${tag(opponent)}.`, [opponent]);
      return;
    }
    await this.startMatch(ctx, challenger, ctx.senderJid);
  }

  async onDecline(ctx: PlayContext): Promise<void> {
    const { challenger, opponent } = this.opts;
    if (this.phase !== 'waiting') {
      await ctx.reply(`La partida ya empezó. Usa *${this.opts.prefix}rendirse* si quieres abandonar.`);
      return;
    }
    if (ctx.senderJid !== challenger && ctx.senderJid !== opponent) {
      await ctx.reply('Solo los jugadores pueden rechazar el reto.');
      return;
    }
    this.finish(ctx);
    const who = ctx.senderJid === challenger ? 'canceló el reto' : 'rechazó el reto';
    await ctx.reply(`🚫 ${tag(ctx.senderJid)} ${who}.`, [ctx.senderJid]);
  }

  private async startMatch(ctx: PlayContext, a: string, b: string): Promise<void> {
    // Sorteo de quién empieza.
    this.players = this.opts.rng() < 0.5 ? [a, b] : [b, a];
    this.turn = 0;
    this.phase = 'playing';
    let intro = `${this.label} — ¡empieza la partida!\n${this.legend()}`;
    if (this.players[0] === BOT) {
      const move = this.opts.engine.botMove(0, this.opts.rng, this.level);
      this.opts.engine.play(move, 0);
      this.turn = 1;
      intro += `\n\n🤖 Empiezo yo.`;
    }
    const status = this.status();
    await ctx.reply(`${intro}\n\n${status.text}`, this.mentionable([...this.players]));
  }

  async onText(text: string, ctx: PlayContext): Promise<boolean> {
    if (this.phase !== 'playing') return false;
    const { engine, symbols, rng } = this.opts;
    const move = engine.parseMove(text);
    if (move === null) return false;
    if (!this.players.includes(ctx.senderJid)) return false; // espectadores
    if (this.players[this.turn] !== ctx.senderJid) {
      await ctx.reply(`⏳ No es tu turno, le toca a ${tag(this.current)}.`, this.mentionable([this.current]));
      return true;
    }
    if (!engine.canPlay(move)) {
      await ctx.reply(`❗ Esa jugada no vale. Elige ${engine.moveHint} que esté libre.`);
      return true;
    }

    engine.play(move, this.turn);
    this.turn = (1 - this.turn) as Player;

    let botNote = '';
    if (engine.outcome() === null && this.current === BOT) {
      const botMove = engine.botMove(this.turn, rng, this.level);
      engine.play(botMove, this.turn);
      botNote = `🤖 Juego en la ${botMove + 1}.\n\n`;
      this.turn = (1 - this.turn) as Player;
    }

    const result = engine.outcome();
    if (result === null) {
      const status = this.status();
      await ctx.reply(`${botNote}${status.text}`, status.mentions);
      return true;
    }

    this.finish(ctx);
    const board = engine.render(symbols);
    if (result === 'draw') {
      this.record(ctx, this.players[0], 'draw');
      this.record(ctx, this.players[1], 'draw');
      await ctx.reply(`${botNote}${board}\n\n🤝 ¡Empate!`);
      return true;
    }
    const winner = this.players[result];
    const loser = this.players[(1 - result) as Player];
    this.record(ctx, winner, 'win');
    this.record(ctx, loser, 'loss');
    const msg =
      winner === BOT
        ? '🤖 ¡Gané yo! Suerte para la próxima.'
        : `🏆 ¡${tag(winner)} gana la partida ${symbols[result]}!`;
    await ctx.reply(`${botNote}${board}\n\n${msg}`, this.mentionable([winner]));
    return true;
  }

  async onQuit(ctx: PlayContext): Promise<boolean> {
    if (this.phase === 'waiting') {
      if (ctx.senderJid !== this.opts.challenger && ctx.senderJid !== this.opts.opponent) {
        await ctx.reply('Solo los jugadores pueden cancelar el reto.');
        return false;
      }
      await this.onDecline(ctx);
      return true;
    }
    if (!this.players.includes(ctx.senderJid)) {
      await ctx.reply('Solo los jugadores pueden rendirse.');
      return false;
    }
    this.finish(ctx);
    const rival = this.players[0] === ctx.senderJid ? this.players[1] : this.players[0];
    this.record(ctx, ctx.senderJid, 'loss');
    this.record(ctx, rival, 'win');
    const rivalText = rival === BOT ? 'Gano yo 🤖' : `Gana ${tag(rival)} 🏆`;
    await ctx.reply(`🏳️ ${tag(ctx.senderJid)} se rindió. ${rivalText}`, this.mentionable([ctx.senderJid, rival]));
    return true;
  }

  status(): { text: string; mentions?: string[] } {
    const { engine, symbols, prefix, challenger, opponent } = this.opts;
    if (this.phase === 'waiting') {
      const who = opponent ? tag(opponent) : 'cualquiera';
      return {
        text: `${this.label}: ${tag(challenger)} espera rival (${who}). Escribe *${prefix}aceptar*.`,
        mentions: this.mentionable([challenger, opponent ?? '']),
      };
    }
    const turnText = this.current === BOT ? '🤖 Pienso...' : `Turno de ${tag(this.current)} ${symbols[this.turn]}`;
    return {
      text: `${engine.render(symbols)}\n\n${turnText}\nResponde con ${engine.moveHint}.`,
      mentions: this.mentionable([this.current]),
    };
  }

  private get current(): string {
    return this.players[this.turn];
  }

  private legend(): string {
    const name = (jid: string) => (jid === BOT ? '🤖 Bot' : tag(jid));
    return `${this.opts.symbols[0]} ${name(this.players[0])}  vs  ${this.opts.symbols[1]} ${name(this.players[1])}`;
  }

  private mentionable(jids: string[]): string[] {
    return jids.filter((j) => j && j !== BOT);
  }

  private finish(ctx: PlayContext): void {
    this.phase = 'over';
    ctx.services.games.end(this.opts.chatJid, this);
  }

  private record(ctx: PlayContext, jid: string, result: 'win' | 'loss' | 'draw'): void {
    if (jid === BOT) return;
    ctx.services.db.addGameResult(this.opts.chatJid, jid, this.id, result);
  }
}
