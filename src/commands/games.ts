import { parseLevel, type BoardEngine } from '../games/board.js';
import { ConnectFour } from '../games/connect4.js';
import { BOT, DuelGame } from '../games/duel.js';
import { ALL_CHARACTERS, ANIME_EMOJIS, GAME_EMOJIS, parseDifficulty, type EmojiPuzzle } from '../games/data/emojis.js';
import { EmojiGame } from '../games/emoji.js';
import { GuessGame } from '../games/guess.js';
import { parseLang } from '../games/lang.js';
import { HangmanGame } from '../games/hangman.js';
import type { ChatGame } from '../games/manager.js';
import { tag } from '../games/text.js';
import { TicTacToe } from '../games/tictactoe.js';
import { TriviaGame } from '../games/trivia.js';
import type { Command, CommandContext } from './types.js';

/**
 * Si ya hay una partida en el chat, la gestiona y devuelve true:
 * - mismo juego con texto ("!tateti 5", "!ahorcado palabra") → se usa como jugada
 * - mismo juego sin texto → muestra el estado
 * - otro juego → avisa de que hay una partida en curso
 */
async function handleActiveGame(ctx: CommandContext, id: string): Promise<boolean> {
  const { games } = ctx.services;
  const active = games.active(ctx.chatJid);
  if (!active) return false;
  if (active.id === id && ctx.text && (await active.onText(ctx.text, ctx, true))) {
    games.touch(ctx.chatJid);
    return true;
  }
  const status = active.status();
  const header = active.id === id ? '' : `🎮 Ya hay una partida de *${active.label}* en este chat.\n\n`;
  const footer = `\n\n_Para terminarla: *${ctx.prefix}rendirse*_`;
  await ctx.reply(`${header}${status.text}${footer}`, status.mentions);
  return true;
}

async function startGame(ctx: CommandContext, game: ChatGame): Promise<void> {
  ctx.services.games.start(ctx.chatJid, game);
  const status = game.status();
  await ctx.reply(status.text, status.mentions);
}

function duelCommand(opts: {
  name: string;
  aliases: string[];
  label: string;
  description: string;
  symbols: readonly [string, string];
  engine: () => BoardEngine;
}): Command {
  return {
    name: opts.name,
    aliases: opts.aliases,
    category: 'juegos',
    description: opts.description,
    usage: '[@rival | bot] [facil|normal|dificil]',
    async execute(ctx) {
      if (await handleActiveGame(ctx, opts.name)) return;
      const words = ctx.args.map((a) => a.toLowerCase());
      const level = words.map(parseLevel).find((l) => l !== null) ?? undefined;
      const rival = ctx.mentions?.find((j) => j !== ctx.senderJid);
      const wantsBot = words.some((w) => ['bot', 'ia', 'cpu', 'maquina', 'máquina'].includes(w));
      // En privado solo se puede jugar contra el bot. En grupo: @rival, "bot", o reto abierto.
      const opponent = rival ?? (wantsBot || level || !ctx.isGroup ? BOT : null);

      const game = new DuelGame({
        id: opts.name,
        label: opts.label,
        engine: opts.engine(),
        symbols: opts.symbols,
        chatJid: ctx.chatJid,
        prefix: ctx.prefix,
        rng: ctx.services.games.random,
        challenger: ctx.senderJid,
        opponent,
        level,
      });
      ctx.services.games.start(ctx.chatJid, game);
      await game.begin(ctx);
    },
  };
}

export const tatetiCommand = duelCommand({
  name: 'tateti',
  aliases: ['ttt', 'gato', '3enraya', 'tictactoe'],
  label: '❌⭕ Tateti',
  description: 'Tres en raya contra alguien del grupo (@rival) o contra el bot',
  symbols: ['❌', '⭕'],
  engine: () => new TicTacToe(),
});

export const connect4Command = duelCommand({
  name: '4enraya',
  aliases: ['conecta4', 'c4', 'cuatro'],
  label: '🔴🟡 4 en raya',
  description: 'Conecta 4 fichas en línea antes que tu rival (@rival o bot)',
  symbols: ['🔴', '🟡'],
  engine: () => new ConnectFour(),
});

export const acceptCommand: Command = {
  name: 'aceptar',
  aliases: ['acepto', 'si'],
  category: 'juegos',
  description: 'Acepta un reto de tateti o 4 en raya',
  async execute(ctx) {
    const game = ctx.services.games.active(ctx.chatJid);
    if (!game?.onAccept) {
      await ctx.reply('No hay ningún reto pendiente en este chat.');
      return;
    }
    await game.onAccept(ctx);
    ctx.services.games.touch(ctx.chatJid);
  },
};

export const declineCommand: Command = {
  name: 'rechazar',
  aliases: ['no'],
  category: 'juegos',
  description: 'Rechaza (o cancela) un reto pendiente',
  async execute(ctx) {
    const game = ctx.services.games.active(ctx.chatJid);
    if (!game?.onDecline) {
      await ctx.reply('No hay ningún reto pendiente en este chat.');
      return;
    }
    await game.onDecline(ctx);
  },
};

export const quitCommand: Command = {
  name: 'rendirse',
  aliases: ['rendir', 'salir', 'terminar', 'saltar'],
  category: 'juegos',
  description: 'Abandona la partida actual del chat',
  async execute(ctx) {
    const game = ctx.services.games.active(ctx.chatJid);
    if (!game) {
      await ctx.reply('No hay ninguna partida en curso.');
      return;
    }
    await game.onQuit(ctx);
  },
};

export const hangmanCommand: Command = {
  name: 'ahorcado',
  aliases: ['hangman', 'ahorca'],
  category: 'juegos',
  description: 'Adivinen la palabra letra a letra entre todos (en inglés: !ahorcado en)',
  usage: '[en | palabra para arriesgar]',
  async execute(ctx) {
    if (await handleActiveGame(ctx, 'ahorcado')) return;
    const lang = parseLang(ctx.text) ?? 'es';
    await startGame(ctx, new HangmanGame(ctx.chatJid, ctx.prefix, ctx.services.games.random, undefined, lang));
  },
};

export const triviaCommand: Command = {
  name: 'trivia',
  aliases: ['pregunta', 'quiz'],
  category: 'juegos',
  description: 'Pregunta de cultura general: el primero que acierta gana (en inglés: !trivia en)',
  usage: '[en]',
  async execute(ctx) {
    if (await handleActiveGame(ctx, 'trivia')) return;
    const lang = parseLang(ctx.text) ?? 'es';
    await startGame(ctx, new TriviaGame(ctx.chatJid, ctx.prefix, ctx.isGroup, ctx.services.games.random, undefined, lang));
  },
};

function emojiCommand(opts: {
  name: string;
  aliases: string[];
  label: string;
  description: string;
  puzzles: readonly EmojiPuzzle[];
  question?: string;
}): Command {
  return {
    name: opts.name,
    aliases: opts.aliases,
    category: 'juegos',
    description: opts.description,
    usage: '[facil | medio | dificil | hardcore]',
    async execute(ctx) {
      if (await handleActiveGame(ctx, opts.name)) return;
      await startGame(
        ctx,
        new EmojiGame({
          id: opts.name,
          label: opts.label,
          chatJid: ctx.chatJid,
          prefix: ctx.prefix,
          rng: ctx.services.games.random,
          puzzles: opts.puzzles,
          level: parseDifficulty(ctx.text),
          question: opts.question,
          trimEmojis: !opts.question,
        }),
      );
    },
  };
}

export const emojiAnimeCommand = emojiCommand({
  name: 'emojianime',
  aliases: ['adivinaanime', 'animeemoji', 'anime'],
  label: '🎌 Adiviná el anime',
  description: 'Adivinen el anime por los emojis: el primero que lo escribe gana',
  puzzles: ANIME_EMOJIS,
});

export const emojiGameCommand = emojiCommand({
  name: 'emojijuego',
  aliases: ['adivinajuego', 'juegoemoji', 'videojuego'],
  label: '🎮 Adiviná el videojuego',
  description: 'Adivinen el videojuego por los emojis: el primero que lo escribe gana',
  puzzles: GAME_EMOJIS,
});

export const characterCommand = emojiCommand({
  name: 'personaje',
  aliases: ['adivinapersonaje', 'animepersonaje', 'quienes'],
  label: '👤 ¿De dónde es este personaje?',
  description: 'Les doy un personaje de anime o videojuego y adivinan de cuál es',
  puzzles: ALL_CHARACTERS,
  question: '👤 Personaje: ',
});

export const guessCommand: Command = {
  name: 'adivina',
  aliases: ['numero', 'número', 'adivinar'],
  category: 'juegos',
  description: 'Adivinen el número del 1 al 100 con pistas',
  async execute(ctx) {
    if (await handleActiveGame(ctx, 'adivina')) return;
    await startGame(ctx, new GuessGame(ctx.chatJid, ctx.services.games.random));
  },
};

export const scoresCommand: Command = {
  name: 'puntos',
  aliases: ['puntaje', 'scores', 'tabla'],
  category: 'juegos',
  description: 'Ranking de victorias en los juegos de este chat',
  usage: '[juego]',
  async execute(ctx) {
    const game = ctx.args[0]?.toLowerCase();
    const rows = ctx.services.db.getGameRanking(ctx.chatJid, 10, game);
    if (rows.length === 0) {
      await ctx.reply(`Todavía no hay puntos${game ? ` de *${game}*` : ''} en este chat. ¡Prueba *${ctx.prefix}tateti*!`);
      return;
    }
    const medals = ['🥇', '🥈', '🥉'];
    const list = rows
      .map((r, i) => {
        const who = r.name ?? tag(r.user_jid);
        return `${medals[i] ?? `*${i + 1}.*`} ${who} — ${r.wins} 🏆 · ${r.losses} ❌ · ${r.draws} 🤝`;
      })
      .join('\n');
    await ctx.reply(`📊 Ranking de juegos${game ? ` (${game})` : ''}\n\n${list}`);
  },
};
