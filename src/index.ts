import path from 'node:path';
import type { WASocket, WAMessage } from 'baileys';
import { GameManager } from './games/manager.js';
import { createRegistry } from './commands/index.js';
import { handleText } from './commands/handler.js';
import { config } from './config.js';
import { BotDatabase } from './db/database.js';
import { AudioService } from './services/audio.js';
import { MusicService } from './services/music.js';
import { BotState } from './state.js';
import { logger } from './utils/logger.js';
import { connectToWhatsApp } from './whatsapp/connection.js';
import { extractMentions, extractText, isGroupJid, senderOf } from './whatsapp/message.js';

const db = new BotDatabase(path.join(config.dataDir, 'bot.sqlite'));
const services = {
  db,
  music: new MusicService(),
  audio: new AudioService(),
  state: new BotState(),
  games: new GameManager(),
};
const registry = createRegistry();

async function onMessage(sock: WASocket, msg: WAMessage): Promise<void> {
  const chatJid = msg.key.remoteJid;
  if (!chatJid || msg.key.fromMe || chatJid === 'status@broadcast') return;

  const text = extractText(msg);
  const senderJid = senderOf(msg);
  if (!text || !senderJid) return;

  await handleText(registry, text, {
    chatJid,
    senderJid,
    senderName: msg.pushName ?? null,
    isGroup: isGroupJid(chatJid),
    mentions: extractMentions(msg),
    services,
    reply: async (body, mentions) => {
      await sock.sendMessage(chatJid, { text: body, mentions }, { quoted: msg });
    },
    react: async (emoji) => {
      await sock.sendMessage(chatJid, { react: { text: emoji, key: msg.key } });
    },
    sendAudio: async ({ file, voiceNote }) => {
      await sock.sendMessage(
        chatJid,
        { audio: { url: file }, mimetype: 'audio/ogg; codecs=opus', ptt: voiceNote },
        { quoted: msg },
      );
    },
  });
}

await connectToWhatsApp({
  onSocket(sock) {
    sock.ev.on('messages.upsert', ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        onMessage(sock, msg).catch((err) => logger.error({ err }, 'Error procesando mensaje'));
      }
    });
  },
});

function shutdown(signal: string): void {
  logger.info(`Recibido ${signal}, cerrando...`);
  db.close();
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
