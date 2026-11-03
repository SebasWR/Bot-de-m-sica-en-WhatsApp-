import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { parseCommand } from './parser.js';
import type { CommandRegistry } from './registry.js';
import type { CommandContext } from './types.js';

export type IncomingContext = Omit<CommandContext, 'invokedAs' | 'args' | 'text' | 'prefix'>;

/**
 * Mensaje normal (sin prefijo): si hay una partida en el chat, se lo pasa
 * (p. ej. "5" en el tateti o "a" en el ahorcado). Devuelve true si el juego lo usó.
 */
async function handleGameText(rawText: string, base: IncomingContext): Promise<boolean> {
  const { games, db } = base.services;
  const game = games.active(base.chatJid);
  if (!game) return false;
  try {
    const consumed = await game.onText(rawText, base, false);
    if (consumed) {
      games.touch(base.chatJid);
      db.touchUser(base.senderJid, base.senderName);
    }
    return consumed;
  } catch (err) {
    logger.error({ err, game: game.id }, 'Error en juego');
    return false;
  }
}

/**
 * Recibe el texto de un mensaje y, si es un comando, lo ejecuta.
 * Si no es un comando pero hay una partida activa en el chat, se lo pasa al juego.
 * Devuelve true si el mensaje se procesó.
 */
export async function handleText(
  registry: CommandRegistry,
  rawText: string,
  base: IncomingContext,
): Promise<boolean> {
  const parsed = parseCommand(rawText, config.prefix);
  if (!parsed) return handleGameText(rawText, base);

  const command = registry.get(parsed.name);
  if (!command) {
    await base.reply(`No conozco el comando *${config.prefix}${parsed.name}*. Escribe *${config.prefix}ayuda*.`);
    return false;
  }

  const { db, state } = base.services;
  const user = db.touchUser(base.senderJid, base.senderName);
  if (user.banned) return true;

  if (command.cooldown) {
    const wait = state.cooldownRemaining(base.senderJid, config.cooldownSeconds);
    if (wait > 0) {
      await base.reply(`⏱ Espera ${wait}s antes de pedir otra canción.`);
      return true;
    }
  }

  const ctx: CommandContext = {
    ...base,
    invokedAs: parsed.name,
    args: parsed.args,
    text: parsed.text,
    prefix: config.prefix,
  };

  logger.info({ user: base.senderJid, chat: base.chatJid, command: command.name, text: parsed.text }, 'Comando');
  try {
    await command.execute(ctx);
  } catch (err) {
    logger.error({ err, command: command.name }, 'Error ejecutando comando');
    await base.react('❌').catch(() => undefined);
    await base.reply('💥 Ocurrió un error procesando tu pedido. Inténtalo de nuevo en un momento.').catch(() => undefined);
  }
  return true;
}
