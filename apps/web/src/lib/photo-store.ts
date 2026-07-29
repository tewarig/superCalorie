import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PHOTO_DIR } from "./db";

/**
 * Meal photos live on disk beside the database rather than as BLOBs in it:
 * SQLite would work, but images are large, never queried, and streaming a
 * file keeps the database small enough to stay fast.
 */

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * Deliberately a whitelist. The extension is derived from this rather than
 * from the client's filename, so an upload cannot choose its own path.
 */
export const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

function pathFor(id: string, contentType: string): string {
  /* v8 ignore next -- the upload route rejects any type not in ALLOWED_TYPES
     before a path is ever built, so "bin" is belt-and-braces. */
  return join(PHOTO_DIR, `${id}.${ALLOWED_TYPES[contentType] ?? "bin"}`);
}

export async function writePhoto(
  id: string,
  contentType: string,
  bytes: Uint8Array,
): Promise<void> {
  await mkdir(PHOTO_DIR, { recursive: true });
  await writeFile(pathFor(id, contentType), bytes);
}

export async function readPhoto(id: string, contentType: string): Promise<Buffer> {
  return readFile(pathFor(id, contentType));
}
