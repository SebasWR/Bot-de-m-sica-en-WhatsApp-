import type { BotDatabase } from '../db/database.js';
import type { AudioService } from '../services/audio.js';
import type { MusicService } from '../services/music.js';
import type { BotState } from '../state.js';

export interface Services {
  db: BotDatabase;
  music: MusicService;
  audio: AudioService;
  state: BotState;
}

export interface AudioPayload {
  file: string;
  title: string;
  voiceNote: boolean;
}

/**
 * Todo lo que un comando necesita. No depende directamente de Baileys,
 * así los comandos se pueden probar sin conectarse a WhatsApp.
 */
export interface CommandContext {
  chatJid: string;
  senderJid: string;
  senderName: string | null;
  isGroup: boolean;
  /** Nombre del comando tal como lo escribió el usuario (puede ser un alias). */
  invokedAs: string;
  args: string[];
  /** Todo el texto después del comando. */
  text: string;
  prefix: string;
  services: Services;
  reply(text: string): Promise<void>;
  react(emoji: string): Promise<void>;
  sendAudio(audio: AudioPayload): Promise<void>;
}

export interface Command {
  name: string;
  aliases?: string[];
  description: string;
  usage?: string;
  /** Si es true, se aplica el tiempo de espera entre usos (comandos pesados). */
  cooldown?: boolean;
  execute(ctx: CommandContext): Promise<void>;
}
