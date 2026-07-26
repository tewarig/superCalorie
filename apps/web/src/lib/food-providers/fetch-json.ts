/**
 * Shared fetch for the food providers.
 *
 * Open Food Facts serves intermittent 503s that succeed immediately on a
 * second attempt, so one short retry is the difference between a working
 * search and an empty one. Retries are limited to 5xx: a 429 means we are
 * over the rate limit and hitting it again only makes that worse, and a 4xx
 * will not fix itself.
 */
export async function fetchJson<T>(
  url: URL,
  signal: AbortSignal,
  headers: Record<string, string> = {},
): Promise<T> {
  let lastStatus = 0;

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (signal.aborted) break;
    }

    const response = await fetch(url, { signal, headers });
    if (response.ok) return (await response.json()) as T;

    lastStatus = response.status;
    if (response.status < 500) break;
  }

  throw new Error(`Request to ${url.host} failed with ${lastStatus}`);
}
