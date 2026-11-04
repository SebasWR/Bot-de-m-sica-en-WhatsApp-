import { DIFFICULTY_LABEL, puzzlesFor, type Difficulty, type EmojiPuzzle } from './data/emojis.js';
import type { ChatGame, PlayContext } from './manager.js';
import { pick, type Rng } from './random.js';
import { fold, tag } from './text.js';

/** "The Legend of Zelda!" → "legendofzelda" (sin tildes, signos ni artículo inicial). */
export function normalizeAnswer(text: string): string {
  return fold(text.trim())
    .replace(/^(the|el|la|los|las)\s+/, '')
    .replace(/[^a-z0-9ñ]/g, '');
}

/** Distancia de edición (cantidad de letras cambiadas, agregadas o borradas). */
export function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]!;
      prev[j] = Math.min(prev[j]! + 1, prev[j - 1]! + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length]!;
}

/** true si `guess` es la respuesta (o un alias), perdonando un error de tipeo en nombres largos. */
export function matchesAnswer(guess: string, puzzle: EmojiPuzzle): boolean {
  const g = normalizeAnswer(guess);
  if (!g) return false;
  return [puzzle.answer, ...(puzzle.aliases ?? [])].some((option) => {
    const o = normalizeAnswer(option);
    if (g === o) return true;
    const allowed = o.length >= 10 ? 2 : o.length >= 5 ? 1 : 0;
    return allowed > 0 && editDistance(g, o) <= allowed;
  });
}

/**
 * Adivinar un anime o un videojuego a partir de emojis. Se responde escribiendo
 * el nombre en el chat; el primero que acierta gana. "pista" da una ayuda.
 */
export class EmojiGame implements ChatGame {
  readonly puzzle: EmojiPuzzle;
  readonly id: string;
  readonly label: string;
  readonly level: Difficulty | null;
  private readonly chatJid: string;
  private readonly prefix: string;
  /** Texto que acompaña a la pista principal (los emojis o el nombre del personaje). */
  private readonly question: string;
  /** Si es true, en hardcore se muestra solo la mitad de los emojis. */
  private readonly trimEmojis: boolean;
  private hinted = false;

  constructor(opts: {
    id: string;
    label: string;
    chatJid: string;
    prefix: string;
    rng: Rng;
    puzzles: readonly EmojiPuzzle[];
    level?: Difficulty | null;
    puzzle?: EmojiPuzzle;
    question?: string;
    trimEmojis?: boolean;
  }) {
    this.id = opts.id;
    this.chatJid = opts.chatJid;
    this.prefix = opts.prefix;
    this.level = opts.level ?? null;
    this.label = this.level ? `${opts.label} · ${DIFFICULTY_LABEL[this.level]}` : opts.label;
    this.question = opts.question ?? '';
    this.trimEmojis = opts.trimEmojis ?? false;
    this.puzzle = opts.puzzle ?? pick(opts.rng, puzzlesFor(opts.puzzles, this.level));
  }

  private get hardcore(): boolean {
    return this.level === 'hardcore';
  }

  /** Lo que se muestra: en hardcore, solo la mitad de los emojis (redondeando para arriba, mínimo 2). */
  get shown(): string {
    if (!this.hardcore || !this.trimEmojis) return this.puzzle.emojis;
    const parts = [...new Intl.Segmenter('es', { granularity: 'grapheme' }).segment(this.puzzle.emojis)].map((p) => p.segment);
    return parts.slice(0, Math.max(2, Math.ceil(parts.length / 2))).join('');
  }

  private get again(): string {
    return `${this.prefix}${this.id}${this.level ? ` ${this.level}` : ''}`;
  }

  async onText(text: string, ctx: PlayContext, explicit: boolean): Promise<boolean> {
    const trimmed = text.trim();
    if (/^(pista|hint|ayuda)$/i.test(trimmed)) {
      if (this.hardcore) {
        await ctx.reply('💀 En hardcore no hay pistas.');
        return true;
      }
      this.hinted = true;
      await ctx.reply(`💡 Pista: _${this.puzzle.hint}_\nEmpieza con *${this.firstLetters()}*`);
      return true;
    }
    if (matchesAnswer(trimmed, this.puzzle)) {
      ctx.services.games.end(this.chatJid, this);
      ctx.services.db.addGameResult(this.chatJid, ctx.senderJid, this.id, 'win');
      await ctx.react('✅');
      await ctx.reply(
        `🎉 ¡Correcto, ${tag(ctx.senderJid)}! Era *${this.puzzle.answer}* ${this.puzzle.emojis}\nOtra: *${this.again}*`,
        [ctx.senderJid],
      );
      return true;
    }
    // En el chat normal, lo que no es la respuesta se ignora (puede ser charla).
    if (!explicit) return false;
    await ctx.react('❌');
    await ctx.reply(`❌ No es *${trimmed}*. ${this.hardcore ? 'Seguí intentando.' : 'Seguí intentando o escribí *pista*.'}`);
    return true;
  }

  /** "One Piece" → "O... P..." */
  private firstLetters(): string {
    return this.puzzle.answer
      .split(/\s+/)
      .map((w) => `${w[0]!.toUpperCase()}…`)
      .join(' ');
  }

  async onQuit(ctx: PlayContext): Promise<boolean> {
    ctx.services.games.end(this.chatJid, this);
    await ctx.reply(`🏳️ Nadie la sacó. Era *${this.puzzle.answer}* ${this.puzzle.emojis}\nOtra: *${this.again}*`);
    return true;
  }

  status(): { text: string } {
    const hint = this.hinted ? `\n💡 _${this.puzzle.hint}_` : '';
    return {
      text:
        `${this.label}\n\n${this.question}${this.shown}${this.puzzle.tag ? ` _(${this.puzzle.tag})_` : ''}${hint}\n\n` +
        `Escriban el nombre en el chat: ¡el primero que acierte gana! ` +
        (this.hardcore
          ? `Sin pistas 💀. Para abandonar: *${this.prefix}rendirse*.`
          : `Si no sale, escriban *pista* o *${this.prefix}rendirse*.`),
    };
  }
}
