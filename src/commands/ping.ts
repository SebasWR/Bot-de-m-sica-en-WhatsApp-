import type { Command } from './types.js';

export const pingCommand: Command = {
  name: 'ping',
  description: 'Comprueba que el bot está activo',
  async execute(ctx) {
    const uptime = Math.round(process.uptime());
    await ctx.reply(`🏓 ¡Pong! Activo desde hace ${uptime}s`);
  },
};
