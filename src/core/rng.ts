/**
 * Générateur pseudo-aléatoire déterministe (mulberry32).
 * Déterministe pour qu'un module donne toujours la même carte : le joueur peut
 * mémoriser les rondes des gardes, comme dans un vrai jeu d'infiltration.
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let mixed = this.state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  }

  /** Entier dans [min, max] inclus. */
  int(min: number, max: number): number {
    if (max < min) throw new RangeError(`int(): max (${max}) < min (${min})`);
    return min + Math.floor(this.next() * (max - min + 1));
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new RangeError("pick(): tableau vide");
    return items[Math.floor(this.next() * items.length)] as T;
  }

  shuffle<T>(items: readonly T[]): T[] {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(this.next() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex] as T, shuffled[index] as T];
    }
    return shuffled;
  }
}

/** Hash FNV-1a : transforme l'id d'un module en graine stable. */
export function seedFromString(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
