"use client";

import { useEffect, useState } from "react";
import { readPhoto } from "@/lib/local-store";

/**
 * Renders a photo held in IndexedDB. The blob has to be turned into an
 * object URL to be displayed, and that URL must be revoked afterwards or
 * the blob stays pinned in memory for the life of the page.
 */
export function LocalPhoto({ photoId, alt }: { photoId: string; alt: string }) {
  const url = useLocalPhotoUrl(photoId);

  if (!url) {
    return <span className="h-10 w-10 shrink-0 rounded-control border border-line bg-moss-pale" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- blob: URL, not a remote asset
    <img
      src={url}
      alt={alt}
      className="h-10 w-10 shrink-0 rounded-control border border-line object-cover"
    />
  );
}

/**
 * The object URL on its own, for callers that render the photo themselves —
 * the shared LoggedFoodRow takes a URL rather than an id, because the mobile
 * app stores photos as files on disk and has no IndexedDB to read.
 */
export function useLocalPhotoUrl(photoId: string | null): string | null {
  // The id is stored alongside the URL rather than clearing state when the
  // prop changes: clearing means a synchronous setState in an effect, which
  // the React Compiler rejects as a cascading render. Comparing instead also
  // avoids briefly showing the previous entry's photo under a new id.
  const [resolved, setResolved] = useState<{ id: string; url: string } | null>(null);

  useEffect(() => {
    if (!photoId) return;

    let revoked = false;
    let objectUrl: string | null = null;

    readPhoto(photoId).then((blob) => {
      if (!blob || revoked) return;
      objectUrl = URL.createObjectURL(blob);
      setResolved({ id: photoId, url: objectUrl });
    });

    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoId]);

  return resolved?.id === photoId ? resolved.url : null;
}
