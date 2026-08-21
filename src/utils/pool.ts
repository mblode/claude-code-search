import { setImmediate } from "node:timers/promises";

const DEFAULT_CONCURRENCY = 16;

export async function mapPool<T, R>(
  items: readonly T[],
  fn: (item: T) => Promise<R>,
  concurrency = DEFAULT_CONCURRENCY
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }
  const results = Array.from({ length: items.length }) as R[];
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      const item = items[index];
      if (item === undefined) {
        continue;
      }
      results[index] = await fn(item);
    }
  };
  const n = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

export function yieldEventLoop(): Promise<void> {
  return setImmediate();
}
