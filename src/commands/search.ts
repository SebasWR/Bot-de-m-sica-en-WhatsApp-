import { formatDuration } from '../utils/format.js';
import type { Command } from './types.js';

export const searchCommand: Command = {
  name: 'buscar',
  category: 'musica',
  aliases: ['search', 's'],
  description: 'Busca canciones y muestra los 5 primeros resultados',
  usage: '<canción o artista>',
  async execute(ctx) {
    if (!ctx.text) {
      await ctx.reply(`Escribe qué quieres buscar. Ejemplo: *${ctx.prefix}buscar bohemian rhapsody*`);
      return;
    }
    await ctx.react('🔎');
    const tracks = await ctx.services.music.search(ctx.text, 5);
    if (tracks.length === 0) {
      await ctx.reply('😕 No encontré resultados para esa búsqueda.');
      return;
    }
    ctx.services.state.saveSearch(ctx.senderJid, tracks);
    const list = tracks
      .map((t, i) => `*${i + 1}.* ${t.title}\n    ⏱ ${formatDuration(t.duration)}${t.uploader ? ` · ${t.uploader}` : ''}`)
      .join('\n');
    await ctx.reply(
      `🔎 Resultados para "${ctx.text}":\n\n${list}\n\nResponde *${ctx.prefix}play <número>* para descargar una.`,
    );
  },
};
