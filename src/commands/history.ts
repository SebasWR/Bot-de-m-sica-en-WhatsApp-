import { formatDuration } from '../utils/format.js';
import type { Command } from './types.js';

export const historyCommand: Command = {
  name: 'historial',
  aliases: ['history', 'h'],
  description: 'Muestra tus últimas 10 canciones',
  async execute(ctx) {
    const rows = ctx.services.db.getHistory(ctx.senderJid, 10);
    if (rows.length === 0) {
      await ctx.reply(`Aún no has pedido canciones. Prueba *${ctx.prefix}play <canción>*.`);
      return;
    }
    const list = rows.map((r, i) => `*${i + 1}.* ${r.title} (${formatDuration(r.duration)})`).join('\n');
    await ctx.reply(`🕘 Tus últimas canciones:\n\n${list}`);
  },
};

export const topCommand: Command = {
  name: 'top',
  aliases: ['ranking'],
  description: 'Las canciones más pedidas en el bot',
  async execute(ctx) {
    const rows = ctx.services.db.getTopSongs(10);
    if (rows.length === 0) {
      await ctx.reply('Todavía no hay canciones en el ranking.');
      return;
    }
    const list = rows.map((r, i) => `*${i + 1}.* ${r.title} — ${r.plays} ${r.plays === 1 ? 'vez' : 'veces'}`).join('\n');
    await ctx.reply(`🏆 Top canciones:\n\n${list}`);
  },
};
