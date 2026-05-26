/**
 * Concurrency limiter (semaphore) for parallel file downloads.
 * Limits simultaneous operations to a configurable max.
 */

export class Semaphore {
  private count: number;
  private readonly queue: Array<() => void> = [];

  constructor(max: number) {
    this.count = max;
  }

  acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.count > 0) {
        this.count--;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.count++;
    }
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

/**
 * Run tasks in parallel with a concurrency limit.
 * Returns results in the same order as input.
 */
export async function mapConcurrent<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency = 5,
  signal?: AbortSignal
): Promise<R[]> {
  const semaphore = new Semaphore(concurrency);
  return Promise.all(
    items.map(async (item, i) => {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      return semaphore.run(() => fn(item, i));
    })
  );
}
