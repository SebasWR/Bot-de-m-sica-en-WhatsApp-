import { config } from '../config.js';
import type { Command } from './types.js';
import type { CommandRegistry } from './registry.js';

export function createHelpCommand(registry: CommandRegistry): Command {
  return {
    name: 'ayuda',
    aliases: ['help', 'menu'],
    description: 'Muestra la lista de comandos',
    async execute(ctx) {
      const lines = registry.list().map((cmd) => {
        const usage = cmd.usage ? ` ${cmd.usage}` : '';
        const aliases = cmd.aliases?.length ? ` _(${cmd.aliases.map((a) => ctx.prefix + a).join(', ')})_` : '';
        return `• *${ctx.prefix}${cmd.name}${usage}*${aliases}\n   ${cmd.description}`;
      });
      await ctx.reply(`🎵 *${config.botName}* — comandos disponibles\n\n${lines.join('\n\n')}`);
    },
  };
}
