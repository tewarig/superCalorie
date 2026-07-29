import { describe, expect, it } from "vitest";
import { GET as listEntries, POST as logEntry } from "@/app/api/entries/route";
import { DELETE as removeEntry } from "@/app/api/entries/[id]/route";
import { GET as exportAll } from "@/app/api/export/route";
import { call, createAccount, getRequest, jsonRequest } from "./helpers";

/** Logs a custom entry and returns its id. */
async function log(token: string, name: string, date = "2026-07-26"): Promise<string> {
  const response = await call(
    logEntry,
    jsonRequest("POST", "/api/entries", { name, calories: 200, date }, token),
  );
  return (await response.json()).entry.id;
}

describe("GET /api/entries?since=", () => {
  it("narrows the result to recent work, rather than re-sending a year of logging", async () => {
    const { token } = await createAccount("sync-since@example.com");
    await log(token, "Ancient", "2020-01-01");

    const response = await call(
      listEntries,
      getRequest("/api/entries?since=2026-01-01T00:00:00.000Z", token),
    );

    // Logged with a 2020 date but created now, so it is still recent work —
    // the filter is on when it was written, not on the day it belongs to,
    // because a backdated entry is exactly what a catching-up client needs.
    expect((await response.json()).entries).toHaveLength(1);
  });

  it("never misses an entry written in the same millisecond as the watermark", async () => {
    const { token } = await createAccount("sync-boundary@example.com");

    // Timestamps are millisecond resolution and these run in a tight loop, so
    // several of these share a created_at — and a watermark taken from one of
    // them lands exactly on the others. A strict `>` would skip them and
    // never offer them again, which is silent data loss. Re-sending the
    // boundary is harmless: the client merges by id.
    const ids = [await log(token, "A"), await log(token, "B"), await log(token, "C")];

    const first = await call(listEntries, getRequest("/api/entries?date=2026-07-26", token));
    const watermark = (await first.json()).entries[0].createdAt;

    const response = await call(
      listEntries,
      getRequest(`/api/entries?since=${encodeURIComponent(watermark)}`, token),
    );
    const returned = (await response.json()).entries.map((e: { id: string }) => e.id);

    for (const id of ids) {
      expect(returned, `entry ${id} must not be skipped at the boundary`).toContain(id);
    }
  });

  it("reports deletions, so a delete on one device reaches the others", async () => {
    const { token } = await createAccount("sync-delete@example.com");
    const id = await log(token, "Doomed");

    const watermark = new Date().toISOString();
    await call(removeEntry, jsonRequest("DELETE", `/api/entries/${id}`, undefined, token), { params: Promise.resolve({ id }) });

    const response = await call(listEntries, getRequest(`/api/entries?since=${encodeURIComponent(watermark)}`, token));
    const body = await response.json();

    expect(body.deletions.map((d: { id: string }) => d.id)).toEqual([id]);
    // The entry itself is gone, not returned as changed.
    expect(body.entries).toEqual([]);
  });

  it("hands back a watermark from the server's clock, not the client's", async () => {
    const { token } = await createAccount("sync-watermark@example.com");

    const response = await call(listEntries, getRequest("/api/entries?since=2026-01-01T00:00:00.000Z", token));

    expect((await response.json()).syncedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("rejects a malformed timestamp rather than treating it as everything", async () => {
    const { token } = await createAccount("sync-bad@example.com");

    const response = await call(listEntries, getRequest("/api/entries?since=last%20tuesday", token));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/ISO 8601/);
  });

  it("still serves the day view when since is absent", async () => {
    const { token } = await createAccount("sync-day@example.com");
    await log(token, "Lunch", "2026-07-26");

    const response = await call(listEntries, getRequest("/api/entries?date=2026-07-26", token));
    const body = await response.json();

    expect(body.date).toBe("2026-07-26");
    expect(body.entries).toHaveLength(1);
  });
});

describe("tombstones", () => {
  it("does not record one for an entry the user does not own", async () => {
    const { token: owner } = await createAccount("tomb-owner@example.com");
    const { token: other } = await createAccount("tomb-other@example.com");
    const id = await log(owner, "Not yours");

    await call(removeEntry, jsonRequest("DELETE", `/api/entries/${id}`, undefined, other), { params: Promise.resolve({ id }) });

    // The failed delete must not tombstone an id for someone else's account,
    // or that account starts refusing an entry it still holds.
    const response = await call(exportAll, getRequest("/api/export", other));
    expect((await response.json()).deletions).toEqual([]);
  });

  it("carries tombstones in a full export", async () => {
    const { token } = await createAccount("tomb-export@example.com");
    const id = await log(token, "Gone");

    await call(removeEntry, jsonRequest("DELETE", `/api/entries/${id}`, undefined, token), { params: Promise.resolve({ id }) });

    const response = await call(exportAll, getRequest("/api/export", token));
    const snapshot = await response.json();

    expect(snapshot.deletions.map((d: { id: string }) => d.id)).toEqual([id]);
    expect(snapshot.entries).toEqual([]);
  });
});
