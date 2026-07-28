"use client";

import type { ImportResult } from "@supercalorie/core";
import { useRef, useState } from "react";

/**
 * Import and export. Everything lives on this device, so this is also the
 * only backup — which is exactly why it's a first-class control rather than
 * something buried in a settings screen.
 */
export function DataMenu({
  exportJSON,
  exportCSV,
  importFile,
}: {
  exportJSON: () => string;
  exportCSV: () => string;
  importFile: (file: File) => Promise<ImportResult>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  function download(contents: string, extension: "json" | "csv") {
    const type = extension === "json" ? "application/json" : "text/csv";
    const url = URL.createObjectURL(new Blob([contents], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `supercalorie-${new Date().toISOString().slice(0, 10)}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(file: File) {
    setMessage(null);
    setFailed(false);
    try {
      const { added, skipped } = await importFile(file);
      setFailed(false);
      setMessage(
        added === 0
          ? `Nothing new — all ${skipped} entries were already here.`
          : `Imported ${added} ${added === 1 ? "entry" : "entries"}${
              skipped > 0 ? `, skipped ${skipped} already present` : ""
            }.`,
      );
    } catch (cause) {
      setFailed(true);
      setMessage(cause instanceof Error ? cause.message : "That file couldn't be read.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <section className="rounded-2xl border border-sand bg-white p-5">
      <h3 className="font-display text-lg font-semibold text-ink">Your data</h3>
      <p className="mt-1 text-sm text-ink-soft">
        Everything is stored on this device. Export to keep a backup or move to another one.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => download(exportJSON(), "json")}
          className="rounded-full bg-leaf px-4 py-2 text-sm font-semibold text-cream transition-colors hover:bg-leaf-deep"
        >
          Export JSON
        </button>
        <button
          type="button"
          onClick={() => download(exportCSV(), "csv")}
          className="rounded-full border border-ink px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-parchment"
        >
          Export CSV
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-full border border-sand px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-ink hover:text-ink"
        >
          Import…
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.csv,application/json,text/csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </div>

      {message && (
        <p className={`mt-3 text-sm ${failed ? "text-red-700" : "text-leaf-deep"}`}>{message}</p>
      )}

      <p className="mt-3 text-xs text-ink-faint">
        JSON keeps everything and is the one to use for backups. CSV holds one row per entry for
        spreadsheets, and carries no photos or settings.
      </p>
    </section>
  );
}
