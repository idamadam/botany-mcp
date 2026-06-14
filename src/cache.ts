export class TtlCache<T> {
  private readonly items = new Map<string, { expiresAt: number; value: T }>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): T | undefined {
    const item = this.items.get(key);
    if (!item) {
      return undefined;
    }

    if (Date.now() > item.expiresAt) {
      this.items.delete(key);
      return undefined;
    }

    return item.value;
  }

  set(key: string, value: T) {
    this.items.set(key, {
      expiresAt: Date.now() + this.ttlMs,
      value
    });
  }
}
