/**
 * High-performance In-Memory Socket Rate Limiter & Flood Guard (حماية المقابس والفلود)
 * Protects the Node.js event loop and chat rooms from rapid bot spam, DDoS scripts, and socket abuse.
 */

interface RateBucket {
  tokens: number;
  lastRefill: number;
  burstCount: number;
}

export class SocketFloodGuard {
  private buckets = new Map<string, RateBucket>();
  private bannedUntil = new Map<string, number>();

  // Default configuration: max 25 actions per 3-second window per socket
  constructor(
    private capacity: number = 25,
    private refillRatePerSec: number = 8,
    private cooldownPenaltyMs: number = 4000
  ) {
    // Auto-prune stale buckets every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if an action from a socket or IP is allowed
   * Returns true if allowed, false if blocked (flooding)
   */
  public isAllowed(identifier: string, isExempt: boolean = false): boolean {
    if (isExempt || !identifier) return true;

    const now = Date.now();

    // Check active temporary cooldown
    const penaltyUntil = this.bannedUntil.get(identifier);
    if (penaltyUntil && now < penaltyUntil) {
      return false;
    }

    let bucket = this.buckets.get(identifier);
    if (!bucket) {
      bucket = {
        tokens: this.capacity,
        lastRefill: now,
        burstCount: 0
      };
      this.buckets.set(identifier, bucket);
    }

    // Refill tokens based on elapsed time
    const elapsedSec = (now - bucket.lastRefill) / 1000;
    if (elapsedSec > 0) {
      bucket.tokens = Math.min(this.capacity, bucket.tokens + elapsedSec * this.refillRatePerSec);
      bucket.lastRefill = now;
    }

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      bucket.burstCount = Math.max(0, bucket.burstCount - 1);
      return true;
    }

    // Bucket depleted: track repeated abuse burst
    bucket.burstCount += 1;
    if (bucket.burstCount >= 5) {
      // Impose temporary cooldown penalty
      this.bannedUntil.set(identifier, now + this.cooldownPenaltyMs);
      bucket.tokens = 0;
      bucket.burstCount = 0;
    }

    return false;
  }

  public reset(identifier: string): void {
    this.buckets.delete(identifier);
    this.bannedUntil.delete(identifier);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [id, until] of this.bannedUntil.entries()) {
      if (now >= until) this.bannedUntil.delete(id);
    }
    for (const [id, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > 10 * 60 * 1000) {
        this.buckets.delete(id);
      }
    }
  }
}

export const socketFloodGuard = new SocketFloodGuard();
