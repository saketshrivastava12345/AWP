/**
 * A small least-recently-used cache, and a deterministic key for plain data.
 *
 * Used to share the car layout (and the geometry built from it) between the
 * anatomy tour and the interactive viewer: both are handed the same CarBuild,
 * serialised to the same key, so the lofted body is built once per page
 * rather than once per canvas and again on every remount.
 */
export class LruCache<K, V> {
  private readonly map = new Map<K, V>();

  constructor(private readonly capacity: number) {
    if (!(capacity >= 1)) throw new RangeError("LruCache capacity must be at least 1");
  }

  get size(): number {
    return this.map.size;
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  /** Returns the value and marks it most recently used. */
  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key) as V;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: K, value: V): this {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.capacity) {
      const oldest = this.map.keys().next();
      if (oldest.done) break;
      this.map.delete(oldest.value);
    }
    return this;
  }

  /** The cached value, or the result of `create` (cached) when absent. */
  getOrCreate(key: K, create: () => V): V {
    const found = this.get(key);
    if (found !== undefined || this.map.has(key)) return found as V;
    const value = create();
    this.set(key, value);
    return value;
  }

  delete(key: K): boolean {
    return this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  /** Keys from least to most recently used. */
  keys(): K[] {
    return [...this.map.keys()];
  }
}

/**
 * JSON with object keys sorted, so two objects with the same content always
 * produce the same string whatever order their properties were written in.
 * `undefined` properties are dropped, as JSON does.
 */
export function stableKey(value: unknown): string {
  return JSON.stringify(value, (_key, entry: unknown) => {
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      return Object.fromEntries(
        Object.entries(entry as Record<string, unknown>).sort(([a], [b]) =>
          a < b ? -1 : a > b ? 1 : 0,
        ),
      );
    }
    return entry;
  });
}
