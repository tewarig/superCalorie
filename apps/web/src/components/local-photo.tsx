"use client";

import { useEffect, useState } from "react";
import { readPhoto } from "@/lib/local-store";

/**
 * Renders a photo held in IndexedDB. The blob has to be turned into an
 * object URL to be displayed, and that URL must be revoked afterwards or
 * the blob stays pinned in memory for the life of the page.
 */
export function LocalPhoto({ photoId, alt }: { photoId: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoked = false;
    let objectUrl: string | null = null;

    readPhoto(photoId).then((blob) => {
      if (!blob || revoked) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });

    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoId]);

  if (!url) {
    return <span className="h-10 w-10 shrink-0 rounded-lg border border-sand bg-parchment" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- blob: URL, not a remote asset
    <img
      src={url}
      alt={alt}
      className="h-10 w-10 shrink-0 rounded-lg border border-sand object-cover"
    />
  );
}
