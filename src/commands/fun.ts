import {
  HAND_EMOJI,
  eightBall,
  loveBar,
  measureBar,
  measureCm,
  measureVerdict,
  parseChoices,
  parseDice,
  parseHand,
  rollDice,
  rpsResult,
  shipPercent,
  shipVerdict,
  type Hand,
} from '../games/fun.js';
import { pick } from '../games/random.js';
import type { AnimeAction } from '../services/gifs.js';
import { tag } from '../games/text.js';
import type { Command } from './types.js';

export const rpsCommand: Command = {
  name: 'ppt',
  aliases: ['rps', 'piedrapapeltijera'],
  category: 'juegos',
  description: 'Piedra, papel o tijera contra el bot',
  usage: '<piedra|papel|tijera>',
  async execute(ctx) {
    const hand = parseHand(ctx.text);
    if (!hand) {
      await ctx.reply(`Elige una: *${ctx.prefix}ppt piedra*, *${ctx.prefix}ppt papel* o *${ctx.prefix}ppt tijera* 🪨📄✂️`);
      return;
    }
    const bot = pick<Hand>(ctx.services.games.random, ['piedra', 'papel', 'tijera']);
    const result = rpsResult(hand, bot);
    ctx.services.db.addGameResult(ctx.chatJid, ctx.senderJid, 'ppt', result);
    const verdict = { win: '🎉 ¡Ganaste!', loss: '😈 ¡Gané yo!', draw: '🤝 ¡Empate!' }[result];
    await ctx.reply(`Tú: ${HAND_EMOJI[hand]} ${hand}\nYo: ${HAND_EMOJI[bot]} ${bot}\n\n${verdict}`);
  },
};

export const diceCommand: Command = {
  name: 'dado',
  aliases: ['dados', 'd', 'roll'],
  category: 'diversion',
  description: 'Tira dados (ej: !dado, !dado 20, !dado 2d6)',
  usage: '[NdM]',
  async execute(ctx) {
    const spec = parseDice(ctx.text);
    if (!spec) {
      await ctx.reply(`Formato: *${ctx.prefix}dado*, *${ctx.prefix}dado 20* o *${ctx.prefix}dado 3d6* (hasta 20 dados de 1000 caras).`);
      return;
    }
    const rolls = rollDice(ctx.services.games.random, spec);
    const total = rolls.reduce((a, b) => a + b, 0);
    const detail = rolls.length > 1 ? `\n${rolls.join(' + ')} = *${total}*` : '';
    await ctx.reply(`🎲 ${spec.count}d${spec.sides}: *${total}*${detail}`);
  },
};

export const coinCommand: Command = {
  name: 'moneda',
  aliases: ['coin', 'caraocruz', 'flip'],
  category: 'diversion',
  description: 'Lanza una moneda: cara o cruz',
  async execute(ctx) {
    const side = ctx.services.games.random() < 0.5 ? '🙂 *Cara*' : '❎ *Cruz*';
    await ctx.reply(`🪙 La moneda gira... ¡${side}!`);
  },
};

export const eightBallCommand: Command = {
  name: 'bola',
  aliases: ['8ball', 'bola8', 'oraculo'],
  category: 'diversion',
  description: 'La bola mágica responde tu pregunta de sí o no',
  usage: '<pregunta>',
  async execute(ctx) {
    if (!ctx.text) {
      await ctx.reply(`Hazme una pregunta. Ejemplo: *${ctx.prefix}bola ¿aprobaré el examen?*`);
      return;
    }
    await ctx.reply(`🎱 _${ctx.text}_\n\n${eightBall(ctx.services.games.random)}`);
  },
};

export const chooseCommand: Command = {
  name: 'elegir',
  aliases: ['choose', 'elige'],
  category: 'diversion',
  description: 'El bot elige por ti entre varias opciones',
  usage: '<opción 1, opción 2 o opción 3>',
  async execute(ctx) {
    const options = parseChoices(ctx.text);
    if (options.length < 2) {
      await ctx.reply(`Dame al menos dos opciones. Ejemplo: *${ctx.prefix}elegir pizza, sushi o tacos*`);
      return;
    }
    await ctx.reply(`🤔 Entre ${options.length} opciones elijo...\n\n👉 *${pick(ctx.services.games.random, options)}*`);
  },
};

export const loveCommand: Command = {
  name: 'amor',
  aliases: ['ship', 'compatibilidad', 'love'],
  category: 'diversion',
  description: 'Calcula el % de amor entre dos personas',
  usage: '<@persona1 @persona2 | nombre1 y nombre2>',
  async execute(ctx) {
    const mentions = (ctx.mentions ?? []).slice(0, 2);
    let pair: [string, string] | null = null;
    let display: [string, string] = ['', ''];
    let tagged: string[] = [];
    if (mentions.length === 2) {
      pair = [mentions[0]!, mentions[1]!];
      display = [tag(pair[0]), tag(pair[1])];
      tagged = pair;
    } else if (mentions.length === 1 && mentions[0] !== ctx.senderJid) {
      pair = [ctx.senderJid, mentions[0]!];
      display = [tag(pair[0]), tag(pair[1])];
      tagged = pair;
    } else {
      const names = ctx.text.split(/\s+y\s+|\s*[,&+]\s*|\s+x\s+/i).map((s) => s.trim()).filter(Boolean);
      if (names.length === 2) {
        pair = [names[0]!, names[1]!];
        display = pair;
      }
    }
    if (!pair) {
      await ctx.reply(`Uso: *${ctx.prefix}amor @persona1 @persona2*, *${ctx.prefix}amor @persona* (tú y esa persona) o *${ctx.prefix}amor Ana y Juan* 💘`);
      return;
    }
    const p = shipPercent(pair[0], pair[1]);
    await ctx.reply(`💘 *Medidor de amor*\n\n${display[0]} ❤️ ${display[1]}\n\n${loveBar(p)}\n*${p}% de amor*\n\n${shipVerdict(p)}`, tagged);
  },
};

export const measureCommand: Command = {
  name: 'memide',
  aliases: ['medir', 'cm'],
  category: 'diversion',
  description: 'Mide los cm de 🍆 de alguien (cambia cada día)',
  usage: '[@persona]',
  async execute(ctx) {
    const target = ctx.mentions?.[0] ?? ctx.senderJid;
    const day = new Date().toISOString().slice(0, 10);
    const cm = measureCm(target, day);
    const who = `A ${tag(target)} le`;
    await ctx.reply(
      `📏 *Medidor oficial* 🍆\n\n${who} mide *${cm} cm*\n${measureBar(cm)}\n\n${measureVerdict(cm)}\n_Medida válida por hoy._`,
      [target],
    );
  },
};

function animeGifCommand(opts: {
  name: string;
  aliases: string[];
  description: string;
  action: AnimeAction;
  emoji: string;
  /** Texto con alguien etiquetado. */
  toSomeone: (from: string, to: string) => string;
  /** Texto sin etiquetar a nadie; null = la @mención es obligatoria. */
  toEveryone: ((from: string) => string) | null;
  kaomoji: string;
}): Command {
  return {
    name: opts.name,
    aliases: opts.aliases,
    category: 'diversion',
    description: opts.description,
    usage: opts.toEveryone ? '[@persona]' : '<@persona>',
    async execute(ctx) {
      const from = ctx.senderJid;
      const to = ctx.mentions?.find((j) => j !== from);
      if (!to && !opts.toEveryone) {
        await ctx.reply(`¿A quién? Etiquétalo: *${ctx.prefix}${opts.name} @persona* ${opts.emoji}`);
        return;
      }
      const caption = to ? opts.toSomeone(tag(from), tag(to)) : opts.toEveryone!(tag(from));
      const mentions = to ? [from, to] : [from];

      await ctx.react(opts.emoji);
      const file = await ctx.services.gifs.randomGifMp4(opts.action).catch(() => null);
      if (!file) {
        await ctx.reply(`${caption} ${opts.kaomoji}\n_No pude conseguir el GIF esta vez._`, mentions);
        return;
      }
      try {
        await ctx.sendGif({ file, caption, mentions });
      } finally {
        await ctx.services.audio.cleanup(file).catch(() => undefined);
      }
    },
  };
}

export const hugCommand = animeGifCommand({
  name: 'abrazo',
  aliases: ['abrazar', 'hug'],
  description: 'Manda un GIF de abrazo de anime (a alguien o a todos)',
  action: 'hug',
  emoji: '🤗',
  toSomeone: (a, b) => `🤗 ${a} abrazó a ${b}`,
  toEveryone: (a) => `🤗 ${a} reparte abrazos para todos`,
  kaomoji: '(っ˘̩╭╮˘̩)っ',
});

export const kissCommand = animeGifCommand({
  name: 'beso',
  aliases: ['besar', 'kiss'],
  description: 'Manda un beso con un GIF de anime a quien etiquetes',
  action: 'kiss',
  emoji: '😘',
  toSomeone: (a, b) => `😘 ${a} le dio un beso a ${b}`,
  toEveryone: null,
  kaomoji: '(˘³˘)♥',
});
