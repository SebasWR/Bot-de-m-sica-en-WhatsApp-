import { config } from '../config.js';
import type { CommandRegistry } from './registry.js';
import type { Command, CommandCategory } from './types.js';

const SECTIONS: { key: CommandCategory; title: string; words: string[] }[] = [
  { key: 'musica', title: '🎵 *Música*', words: ['musica', 'música', 'music'] },
  { key: 'juegos', title: '🎮 *Juegos*', words: ['juegos', 'juego', 'games'] },
  { key: 'diversion', title: '🎲 *Diversión*', words: ['diversion', 'diversión', 'fun'] },
  { key: 'general', title: '⚙️ *General*', words: ['general'] },
];

function sectionFor(word: string | undefined): CommandCategory | undefined {
  if (!word) return undefined;
  return SECTIONS.find((s) => s.words.includes(word.toLowerCase()))?.key;
}

export function createHelpCommand(registry: CommandRegistry): Command {
  return {
    name: 'ayuda',
    aliases: ['help', 'menu', 'comandos', 'juegos'],
    description: 'Muestra la lista de comandos (o una sección: !ayuda juegos)',
    usage: '[musica|juegos|diversion]',
    async execute(ctx) {
      // "!juegos" es un atajo de "!ayuda juegos".
      const only = sectionFor(ctx.invokedAs === 'juegos' ? 'juegos' : ctx.args[0]);
      const detailed = only !== undefined;
      const blocks = SECTIONS.filter((s) => !only || s.key === only).flatMap((section) => {
        const cmds = registry.list().filter((c) => (c.category ?? 'general') === section.key);
        if (cmds.length === 0) return [];
        const lines = cmds.map((cmd) => {
          const usage = cmd.usage ? ` ${cmd.usage}` : '';
          const aliases =
            detailed && cmd.aliases?.length ? ` _(${cmd.aliases.map((a) => ctx.prefix + a).join(', ')})_` : '';
          return `• *${ctx.prefix}${cmd.name}${usage}*${aliases}\n   ${cmd.description}`;
        });
        return [`${section.title}\n${lines.join('\n')}`];
      });
      const tip = detailed
        ? ''
        : `\n\n_Escribe *${ctx.prefix}ayuda juegos* para ver alias y cómo jugar._`;
      const howTo =
        only === 'juegos'
          ? `\n\n*¿Cómo se juega?* Empieza una partida con su comando y luego responde en el chat: ` +
            `números para tateti/4 en raya/adivina, una letra para el ahorcado, A-D para la trivia, y el nombre en los de emojis y *personaje* (o *pista*). ` +
            `Esos tres tienen dificultad: *${ctx.prefix}emojianime facil|medio|dificil|hardcore*. ` +
            `Trivia y ahorcado en inglés: *${ctx.prefix}trivia en*, *${ctx.prefix}ahorcado en*. ` +
            `Una partida por chat; *${ctx.prefix}rendirse* la termina.`
          : '';
      await ctx.reply(`🤖 *${config.botName}* — comandos\n\n${blocks.join('\n\n')}${howTo}${tip}`);
    },
  };
}
