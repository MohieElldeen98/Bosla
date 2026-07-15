"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BoslaPlayer } from "@/components/player/BoslaPlayer";

function hashSource(source: string): string {
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) hash = (hash * 31 + source.charCodeAt(index)) | 0;
  return Math.abs(hash).toString(36);
}

interface MountedVideo {
  wrapper: HTMLDivElement;
  src: string;
  poster?: string;
  title?: string;
}

/** Replaces sanitized video nodes with React-owned wrappers and portals the custom players into them. */
export function ArticleVideoPlayers({ containerId, articleSlug }: { containerId: string; articleSlug: string }) {
  const [videos, setVideos] = useState<MountedVideo[]>([]);
  const [direction, setDirection] = useState<"ltr" | "rtl">("ltr");

  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;
    setDirection(container.dir === "rtl" ? "rtl" : "ltr");
    const mounted: MountedVideo[] = [];
    container.querySelectorAll<HTMLVideoElement>("video").forEach((video) => {
      if (!video.src) return;
      const wrapper = document.createElement("div");
      wrapper.className = "my-6 aspect-video w-full";
      video.replaceWith(wrapper);
      mounted.push({ wrapper, src: video.src, poster: video.poster || undefined, title: video.getAttribute("aria-label") ?? undefined });
    });
    setVideos(mounted);
    return () => {
      mounted.forEach(({ wrapper }) => wrapper.remove());
      setVideos([]);
    };
  }, [containerId]);

  return <>{videos.map(({ wrapper, src, poster, title }, index) => createPortal(
    <BoslaPlayer
      src={src} poster={poster} title={title} showBrandWatermark dir={direction}
      storageKey={`bosla-video-${hashSource(src)}`} articleSlug={articleSlug}
    />, wrapper,
    // Same src twice in one article must not collide on the portal key.
    `${hashSource(src)}-${index}`,
  ))}</>;
}
