import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchJson } from "@/lib/food-providers/fetch-json";

/**
 * The retry exists because Open Food Facts serves intermittent 503s that
 * succeed immediately on a second attempt. That behaviour is invisible in
 * normal runs, so without these tests a regression would only show up as
 * search quietly returning less.
 */

const URL_UNDER_TEST = new URL("https://example.test/search");

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => vi.mocked(fetch).mockReset());

describe("fetchJson", () => {
  it("returns the parsed body on a first-try success", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ ok: true }));

    await expect(fetchJson(URL_UNDER_TEST, new AbortController().signal)).resolves.toEqual({
      ok: true,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries once after a 503 and succeeds", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response("upstream hiccup", { status: 503 }))
      .mockResolvedValueOnce(jsonResponse({ products: [1] }));

    await expect(fetchJson(URL_UNDER_TEST, new AbortController().signal)).resolves.toEqual({
      products: [1],
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("gives up after the second 5xx rather than hammering", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("down", { status: 500 }));

    await expect(fetchJson(URL_UNDER_TEST, new AbortController().signal)).rejects.toThrow(/500/);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("does not retry a 429 — that would make the rate limit worse", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("slow down", { status: 429 }));

    await expect(fetchJson(URL_UNDER_TEST, new AbortController().signal)).rejects.toThrow(/429/);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not retry a 404, which will not fix itself", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("nope", { status: 404 }));

    await expect(fetchJson(URL_UNDER_TEST, new AbortController().signal)).rejects.toThrow(/404/);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("stops retrying once the caller has aborted", async () => {
    const controller = new AbortController();
    vi.mocked(fetch).mockImplementationOnce(async () => {
      // The overall search timed out while the first attempt was in flight.
      controller.abort();
      return new Response("hiccup", { status: 503 });
    });

    await expect(fetchJson(URL_UNDER_TEST, controller.signal)).rejects.toThrow();
    // No second call: waiting out a backoff for a request nobody is waiting
    // on any more just delays the response.
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("passes headers through, which is how Open Food Facts identifies us", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}));
    await fetchJson(URL_UNDER_TEST, new AbortController().signal, { "User-Agent": "test/1.0" });

    expect(fetch).toHaveBeenCalledWith(
      URL_UNDER_TEST,
      expect.objectContaining({ headers: { "User-Agent": "test/1.0" } }),
    );
  });
});
