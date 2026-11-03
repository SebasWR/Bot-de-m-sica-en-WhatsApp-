import type { BotDatabase } from '../db/database.js';
import type { GameManager } from '../games/manager.js';
import type { AudioService } from '../services/audio.js';
import type { MusicService } from '../services/music.js';
import type { BotState } from '../state.js';

export interface Services {
  db: BotDatabase;
  music: MusicService;
  audio: AudioService;
  state: BotState;
  games: GameManager;
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
  /** JIDs mencionados con @ en el mensaje. */
  mentions?: string[];
  /** Nombre del comando tal como lo escribió el usuario (puede ser un alias). */
  invokedAs: string;
  args: string[];
  /** Todo el texto después del comando. */
  text: string;
  prefix: string;
  services: Services;
  /** Responde en el chat. Los JIDs de `mentions` se muestran como @etiquetas. */
  reply(text: string, mentions?: string[]): Promise<void>;
  react(emoji: string): Promise<void>;
  sendAudio(audio: AudioPayload): Promise<void>;
}

export type CommandCategory = 'musica' | 'juegos' | 'diversion' | 'general';

export interface Command {
  name: string;
  /** Sección en la que aparece en !ayuda (por defecto "general"). */
  category?: CommandCategory;
  aliases?: string[];
  description: string;
  usage?: string;
  /** Si es true, se aplica el tiempo de espera entre usos (comandos pesados). */
  cooldown?: boolean;
  execute(ctx: CommandContext): Promise<void>;
}
