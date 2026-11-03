import { pick, randInt, type Rng } from './random.js';
import { fold } from './text.js';

// ── Piedra, papel o tijera ─────────────────────────────────────────────

export type Hand = 'piedra' | 'papel' | 'tijera';
export const HAND_EMOJI: Record<Hand, string> = { piedra: '🪨', papel: '📄', tijera: '✂️' };
const BEATS: Record<Hand, Hand> = { piedra: 'tijera', papel: 'piedra', tijera: 'papel' };

export function parseHand(text: string): Hand | null {
  const t = fold(text.trim());
  if (['piedra', 'roca', 'rock', '🪨', '✊', '👊'].includes(t)) return 'piedra';
  if (['papel', 'paper', '📄', '✋', '🖐', '🖐️'].includes(t)) return 'papel';
  if (['tijera', 'tijeras', 'scissors', '✂', '✂️', '✌', '✌️'].includes(t)) return 'tijera';
  return null;
}

/** Resultado desde el punto de vista de `a`. */
export function rpsResult(a: Hand, b: Hand): 'win' | 'loss' | 'draw' {
  if (a === b) return 'draw';
  return BEATS[a] === b ? 'win' : 'loss';
}

// ── Dados ──────────────────────────────────────────────────────────────

export interface DiceSpec {
  count: number;
  sides: number;
}

/** "" → 1d6, "20" → 1d20, "2d6" → 2d6, "d20" → 1d20. Null si no es válido. */
export function parseDice(text: string): DiceSpec | null {
  const t = text.trim().toLowerCase();
  if (!t) return { count: 1, sides: 6 };
  const m = /^(\d{1,2})?\s*d\s*(\d{1,4})$/.exec(t) ?? /^()(\d{1,4})$/.exec(t);
  if (!m) return null;
  const count = m[1] ? Number(m[1]) : 1;
  const sides = Number(m[2]);
  if (count < 1 || count > 20 || sides < 2 || sides > 1000) return null;
  return { count, sides };
}

export function rollDice(rng: Rng, spec: DiceSpec): number[] {
  return Array.from({ length: spec.count }, () => randInt(rng, 1, spec.sides));
}

// ── Bola 8 mágica ──────────────────────────────────────────────────────

export const EIGHT_BALL = [
  'Sí, definitivamente ✅', 'Es seguro 💯', 'Sin duda 😎', 'Puedes contar con ello 👍',
  'Como yo lo veo, sí 👀', 'Lo más probable 📈', 'Las señales dicen que sí ✨', 'Todo apunta a que sí 🔮',
  'Respuesta confusa, intenta otra vez 🌫️', 'Pregunta más tarde ⏳', 'Mejor no te lo digo ahora 🤐',
  'No puedo predecirlo ahora 🤔', 'Concéntrate y pregunta otra vez 🧘',
  'No cuentes con ello ❌', 'Mi respuesta es no 🙅', 'Mis fuentes dicen que no 📉', 'Muy dudoso 🤨',
  'Ni lo sueñes 😂', 'Jamás de los jamases 🚫', 'Obvio que no 💀',
] as const;

export function eightBall(rng: Rng): string {
  return pick(rng, EIGHT_BALL);
}

// ── Elegir entre opciones ──────────────────────────────────────────────

/** "pizza, sushi o tacos" → ['pizza', 'sushi', 'tacos'] */
export function parseChoices(text: string): string[] {
  return text
    .split(/\s*(?:,|\||;|\s+o\s+|\s+or\s+)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ── Compatibilidad ("ship") ────────────────────────────────────────────

/** Porcentaje estable para un par (el orden no importa): siempre da lo mismo para las mismas dos personas. */
export function shipPercent(a: string, b: string): number {
  const key = [fold(a.trim()), fold(b.trim())].sort().join('❤');
  let h = 2166136261;
  for (const ch of key) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 101;
}

export function shipVerdict(p: number): string {
  if (p >= 90) return '💍 ¡Almas gemelas! Que suenen las campanas.';
  if (p >= 70) return '😍 Hay muchísima química.';
  if (p >= 50) return '😊 Tiene futuro, hay que regarlo.';
  if (p >= 30) return '🤝 Mejor como amigos.';
  if (p >= 10) return '😬 Esto va a costar...';
  return '💔 Ni con un milagro.';
}

export function loveBar(p: number): string {
  const full = Math.round(p / 10);
  return '❤️'.repeat(full) + '🤍'.repeat(10 - full);
}
