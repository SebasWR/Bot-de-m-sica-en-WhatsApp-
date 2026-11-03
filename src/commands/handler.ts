import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { parseCommand } from './parser.js';
import type { CommandRegistry } from './registry.js';
import type { CommandContext } from './types.js';

export type IncomingContext = Omit<CommandContext, 'invokedAs' | 'args' | 'text' | 'prefix'>;

/**
 * Recibe el texto de un mensaje y, si es un comando, lo ejecuta.
 * Devuelve true si el mensaje era un comando conocido.
 */
export async function handleText(
  registry: CommandRegistry,
  rawText: string,
  base: IncomingContext,
): Promise<boolean> {
  const parsed = parseCommand(rawText, config.prefix);
  if (!parsed) return false;

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
