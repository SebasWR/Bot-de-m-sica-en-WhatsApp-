/** Generador de números aleatorios en [0, 1). Se inyecta para poder probar los juegos. */
export type Rng = () => number;

/** Entero aleatorio entre min y max (ambos incluidos). */
export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pick() sobre una lista vacía');
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))]!;
}

/** Copia barajada (Fisher–Yates). */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
