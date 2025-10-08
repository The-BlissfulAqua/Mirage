/**
 * A simple seedable pseudo-random number generator (PRNG).
 * This allows for deterministic simulations that can be replayed.
 * Uses the Mulberry32 algorithm.
 */
export class PRNG {
    private seed: number;

    constructor(seed: number) {
        this.seed = seed;
    }

    /**
     * Returns the next pseudo-random number as a float between 0 (inclusive) and 1 (exclusive).
     */
    public next(): number {
        let t = this.seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    /**
     * Alias for next() to match the Math.random() method signature.
     */
    public random(): number {
        return this.next();
    }
}
