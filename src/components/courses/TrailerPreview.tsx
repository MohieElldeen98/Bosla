"use client";

import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import { BoslaPlayer } from "@/components/player/BoslaPlayer";

/** Cover-with-play that swaps in-place to the trailer — no modal, so the
 *  purchase CTA below stays visible while a visitor previews. */
export function TrailerPreview({
  coverUrl,
  trailerUrl,
  title,
  playLabel,
}: {
  coverUrl: string | null;
  trailerUrl: string | null;
  title: string;
  playLabel: string;
}) {
  const [playing, setPlaying] = useState(false);

  if (playing && trailerUrl) {
    return <BoslaPlayer src={trailerUrl} title={title} poster={coverUrl ?? undefined} showBrandWatermark />;
  }

  return (
    <div className="relative aspect-video overflow-hidden bg-muted">
      {coverUrl ? (
        <Image src={coverUrl} alt="" fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" />
      ) : (
        <div className="size-full bg-gradient-to-br from-primary/20 to-muted" />
      )}
      {trailerUrl && (
        <button
          type="button"
          aria-label={playLabel}
          onClick={() => setPlaying(true)}
          className="absolute inset-0 m-auto flex size-14 items-center justify-center rounded-full bg-background/90 text-primary shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Play className="ms-1 size-6 fill-current" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
