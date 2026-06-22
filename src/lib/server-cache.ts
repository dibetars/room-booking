interface Entry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

export async function withCache<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() < hit.expiresAt) return hit.data as T;
  const data = await fn();
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
  return data;
}

export function invalidate(prefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
