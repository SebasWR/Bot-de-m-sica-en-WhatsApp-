import { config } from '../config.js';
import type { Track } from '../services/music.js';
import { formatDuration } from '../utils/format.js';
import { logger } from '../utils/logger.js';
import type { Command } from './types.js';

export const playCommand: Command = {
  name: 'play',
  category: 'musica',
  aliases: ['p', 'musica', 'cancion'],
  description: 'Descarga una canción y la envía como audio (acepta búsqueda, URL o número de !buscar)',
  usage: '<canción | URL | número>',
  cooldown: true,
  async execute(ctx) {
    const { music, audio, db, state } = ctx.services;
    if (!ctx.text) {
      await ctx.reply(`Escribe una canción. Ejemplo: *${ctx.prefix}play despacito*`);
      return;
    }

    if (!state.tryLock(ctx.senderJid)) {
      await ctx.reply('⏳ Ya estoy procesando una canción tuya, espera a que termine.');
      return;
    }

    const files: string[] = [];
    try {
      await ctx.react('⏳');

      let track: Track | null | undefined;
      if (/^\d{1,2}$/.test(ctx.text)) {
        track = state.pickFromSearch(ctx.senderJid, Number(ctx.text));
        if (!track) {
          await ctx.reply(`No tengo ese resultado. Usa primero *${ctx.prefix}buscar <canción>*.`);
          return;
        }
      } else {
        track = await music.resolve(ctx.text);
      }

      if (!track) {
        await ctx.react('❌');
        await ctx.reply('😕 No encontré esa canción.');
        return;
      }

      if (track.duration !== null && track.duration > config.maxDurationSeconds) {
        await ctx.react('❌');
        await ctx.reply(
          `⚠️ "${track.title}" dura ${formatDuration(track.duration)}. El máximo permitido es ${formatDuration(config.maxDurationSeconds)}.`,
        );
        return;
      }

      state.markUsed(ctx.senderJid);
      await ctx.reply(`🎧 Descargando *${track.title}* (${formatDuration(track.duration)})...`);

      const downloaded = await music.download(track);
      files.push(downloaded.file);
      const got = downloaded.track; // puede ser la versión de SoundCloud si YouTube bloqueó
      const opus = await audio.toOpus(downloaded.file);
      files.push(opus);

      await ctx.sendAudio({ file: opus, title: got.title, voiceNote: config.sendAsVoiceNote });
      db.addHistory({
        userJid: ctx.senderJid,
        chatJid: ctx.chatJid,
        query: ctx.text,
        title: got.title,
        url: got.url,
        duration: got.duration,
      });
      await ctx.react('✅');
    } finally {
      state.unlock(ctx.senderJid);
      await audio.cleanup(...files).catch((err) => logger.warn({ err }, 'No se pudieron borrar temporales'));
    }
  },
};
