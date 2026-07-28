import { emptySnapshot, parseJSON, type Snapshot } from "@supercalorie/core";
import { Directory, File, Paths } from "expo-file-system";

/**
 * On-device storage for the mobile app. This is the source of truth — the
 * app works with no account and no reachable server.
 *
 * Everything lives in the document directory, which iOS and Android both
 * keep out of the reach of storage cleanup, so logs survive until the app is
 * deleted. Photos are separate files rather than being inlined in the JSON,
 * because base64 would bloat the document a thousandfold.
 */

const SNAPSHOT_FILE = "snapshot.json";
const PHOTO_DIR = "photos";

function snapshotFile(): File {
  return new File(Paths.document, SNAPSHOT_FILE);
}

function photoDirectory(): Directory {
  const directory = new Directory(Paths.document, PHOTO_DIR);
  if (!directory.exists) directory.create({ intermediates: true });
  return directory;
}

export async function loadSnapshot(): Promise<Snapshot> {
  const file = snapshotFile();
  if (!file.exists) return emptySnapshot();

  try {
    return parseJSON(await file.text());
  } catch {
    // Never let a damaged file stop the app from opening. Keep it for
    // forensics rather than deleting someone's only copy of their data.
    try {
      file.move(new File(Paths.document, `snapshot.corrupt.${Date.now()}.json`));
    } catch {
      // Nothing more to do — carrying on empty still beats crashing.
    }
    return emptySnapshot();
  }
}

export function saveSnapshot(snapshot: Snapshot): void {
  const file = snapshotFile();
  if (!file.exists) file.create({ overwrite: true });
  file.write(JSON.stringify(snapshot));
}

/**
 * Copies a picked or captured image into our own storage. The URI from the
 * image picker points into a cache the OS may clear, so keeping the original
 * would leave entries with photos that silently vanish.
 */
export function savePhoto(id: string, sourceUri: string, extension: string): string {
  const source = new File(sourceUri);
  const target = new File(photoDirectory(), `${id}.${extension}`);
  source.copySync(target);
  return target.uri;
}

export function photoUri(id: string, extension: string): string | null {
  const file = new File(photoDirectory(), `${id}.${extension}`);
  return file.exists ? file.uri : null;
}

export function deletePhoto(id: string, extension: string): void {
  const file = new File(photoDirectory(), `${id}.${extension}`);
  if (file.exists) file.delete();
}

/** Writes an export to a shareable file and returns its URI. */
export function writeExport(contents: string, extension: "json" | "csv"): string {
  const name = `supercalorie-${new Date().toISOString().slice(0, 10)}.${extension}`;
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(contents);
  return file.uri;
}

/** Opens the system file picker and returns the file's text, or null. */
export async function readImportedFile(): Promise<{ text: string; name: string } | null> {
  const picked = await File.pickFileAsync({ mimeTypes: ["application/json", "text/csv"] });
  const file = Array.isArray(picked) ? picked[0] : picked;
  if (!file || !("uri" in file)) return null;

  const handle = new File(file.uri);
  return { text: await handle.text(), name: handle.name };
}
