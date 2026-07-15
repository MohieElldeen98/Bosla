"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Captions, ChevronDown, Maximize, Pause, Play, RotateCcw, RotateCw,
  Volume2, VolumeX,
} from "lucide-react";
import { BoslaLoader } from "@/components/brand/BoslaLoader";
import { BoslaWatermark } from "@/components/brand/BoslaWatermark";
import { recordVideoEventAction } from "@/learning/actions/video-events.actions";

export interface BoslaPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  chapters?: { time: number; label: string }[];
  watermarkText?: string;
  showBrandWatermark?: boolean;
  initialPosition?: number;
  storageKey?: string;
  onProgress?: (seconds: number, duration: number) => void;
  onComplete?: () => void;
  dir?: "ltr" | "rtl";
  tracks?: { src: string; label: string; srclang: string }[];
  articleSlug?: string;
  lessonId?: string;
}

function formatTime(value: number): string {
  if (!Number.isFinite(value)) return "0:00";
  const seconds = Math.max(0, Math.floor(value));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function BoslaPlayer({
  src, poster, title, chapters = [], watermarkText, showBrandWatermark, initialPosition,
  storageKey, onProgress, onComplete, dir = "ltr", tracks = [], articleSlug, lessonId,
}: BoslaPlayerProps) {
  const t = useTranslations("Player");
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastStoredPosition = useRef(0);
  const lastCallbackProgress = useRef(0);
  const lastAnalyticsProgress = useRef(0);
  const completed = useRef(false);
  const lastTap = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [bufferedRanges, setBufferedRanges] = useState<{ start: number; end: number }[]>([]);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [waiting, setWaiting] = useState(false);
  const [seekHint, setSeekHint] = useState<string | null>(null);
  const [watermarkCorner, setWatermarkCorner] = useState(0);
  const [activeTrack, setActiveTrack] = useState(-1);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const announceActivity = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (playing) hideTimer.current = setTimeout(() => setControlsVisible(false), 2500);
  }, [playing]);

  const reportEvent = useCallback((event: "play" | "pause" | "complete" | "progress", position: number) => {
    if (articleSlug || lessonId) void recordVideoEventAction({ articleSlug, lessonId, event, positionSeconds: Math.floor(position) });
  }, [articleSlug, lessonId]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play(); else video.pause();
  }, []);

  const seekBy = useCallback((amount: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || duration, video.currentTime + amount));
    setSeekHint(`${amount > 0 ? "+" : ""}${amount}s`);
    window.setTimeout(() => setSeekHint(null), 700);
  }, [duration]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) void frameRef.current?.requestFullscreen();
    else void document.exitFullscreen();
  }, []);

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onLoaded = () => {
      setDuration(video.duration || 0);
      const stored = storageKey ? Number(window.localStorage.getItem(storageKey)) : 0;
      const resume = initialPosition && initialPosition > 10 ? initialPosition : stored;
      if (resume > 10 && resume < video.duration * 0.9) video.currentTime = resume;
    };
    const onTime = () => {
      const seconds = video.currentTime;
      setCurrent(seconds);
      setBufferedRanges(Array.from({ length: video.buffered.length }, (_, index) => ({
        start: video.buffered.start(index), end: video.buffered.end(index),
      })));
      if (storageKey && seconds - lastStoredPosition.current >= 5) {
        window.localStorage.setItem(storageKey, String(Math.floor(seconds)));
        lastStoredPosition.current = seconds;
      }
      if (onProgress && seconds - lastCallbackProgress.current >= 10) {
        onProgress(seconds, video.duration || duration);
        lastCallbackProgress.current = seconds;
      }
      if (seconds - lastAnalyticsProgress.current >= 30) {
        reportEvent("progress", seconds);
        lastAnalyticsProgress.current = seconds;
      }
      if (!completed.current && video.duration > 0 && seconds / video.duration >= 0.95) {
        completed.current = true;
        reportEvent("complete", seconds);
        onComplete?.();
      }
    };
    const onPlay = () => { setPlaying(true); reportEvent("play", video.currentTime); announceActivity(); };
    const onPause = () => { setPlaying(false); reportEvent("pause", video.currentTime); setControlsVisible(true); };
    const onWaiting = () => setWaiting(true);
    const onPlaying = () => setWaiting(false);
    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("stalled", onWaiting);
    video.addEventListener("playing", onPlaying);
    return () => {
      video.removeEventListener("loadedmetadata", onLoaded); video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("play", onPlay); video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting); video.removeEventListener("stalled", onWaiting);
      video.removeEventListener("playing", onPlaying);
    };
  }, [announceActivity, duration, initialPosition, onComplete, onProgress, reportEvent, storageKey]);

  useEffect(() => {
    const id = window.setInterval(() => setWatermarkCorner((corner) => (corner + 1) % 4), 45000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.volume = volume;
  }, [volume]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    Array.from(video.textTracks).forEach((track, index) => { track.mode = index === activeTrack ? "showing" : "hidden"; });
  }, [activeTrack, muted]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.target !== frameRef.current && (event.target as HTMLElement).tagName === "INPUT") return;
    const direction = dir === "rtl" ? -1 : 1;
    if (event.key === " " || event.key.toLowerCase() === "k") { event.preventDefault(); togglePlay(); }
    else if (event.key === "ArrowLeft") { event.preventDefault(); seekBy(-5 * direction); }
    else if (event.key === "ArrowRight") { event.preventDefault(); seekBy(5 * direction); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setVolume((value) => Math.min(1, value + 0.1)); }
    else if (event.key === "ArrowDown") { event.preventDefault(); setVolume((value) => Math.max(0, value - 0.1)); }
    else if (event.key.toLowerCase() === "m") { event.preventDefault(); setMuted((value) => !value); }
    else if (event.key.toLowerCase() === "f") { event.preventDefault(); toggleFullscreen(); }
  }

  const progress = duration ? (current / duration) * 100 : 0;
  const watermarkPositions = ["start-4 top-4", "end-4 top-4", "end-4 bottom-20", "start-4 bottom-20"];

  return (
    <div
      ref={frameRef} tabIndex={0} dir={dir} onKeyDown={handleKeyDown} onMouseMove={announceActivity}
      onTouchStart={announceActivity} onFocus={announceActivity} onContextMenu={(event) => event.preventDefault()}
      className="group relative aspect-video w-full overflow-hidden rounded-2xl bg-slate-950 text-white shadow-xl outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={title ?? t("videoPlayer")}
    >
      <video
        ref={videoRef} src={src} poster={poster} preload="metadata" playsInline
        controlsList="nodownload" disablePictureInPicture
        className="size-full cursor-pointer object-contain" onClick={(event) => {
          const now = Date.now();
          if (now - lastTap.current < 300) {
            const rect = videoRef.current?.getBoundingClientRect();
            if (rect && event.clientX < rect.left + rect.width / 3) seekBy(-10);
            else if (rect && event.clientX > rect.left + rect.width * 2 / 3) seekBy(10);
            else toggleFullscreen();
          } else togglePlay();
          lastTap.current = now;
        }}
      >
        {tracks.map((track) => <track key={track.src} src={track.src} label={track.label} srcLang={track.srclang} kind="subtitles" />)}
      </video>
      {showBrandWatermark && <BoslaWatermark className="absolute end-4 top-4 size-14" />}
      {watermarkText && <span className={`pointer-events-none absolute ${watermarkPositions[watermarkCorner]} max-w-[45%] truncate text-[10px] text-white/35`}>{watermarkText}</span>}
      {waiting && <div className="absolute inset-0 flex items-center justify-center bg-black/20"><BoslaLoader className="size-14 text-white" label={t("loading")} /></div>}
      {seekHint && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-lg font-semibold text-white drop-shadow-lg">{seekHint}</span>}
      {!playing && <button type="button" onClick={togglePlay} aria-label={t("play")} className="absolute inset-0 m-auto flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 motion-reduce:transition-none"><Play fill="currentColor" className="ms-1 size-7" /></button>}
      <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pb-3 pt-12 transition-opacity motion-reduce:transition-none ${controlsVisible || !playing ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <div className="relative mb-3 h-4 cursor-pointer" onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          // Logical ratio: the track renders start-edge-first (inset-inline),
          // so in RTL the pointer math must mirror or seeking flips.
          const raw = (event.clientX - rect.left) / rect.width;
          const ratio = dir === "rtl" ? 1 - raw : raw;
          setHoverTime(Math.max(0, Math.min(duration, ratio * duration)));
        }} onMouseLeave={() => setHoverTime(null)} onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const raw = (event.clientX - rect.left) / rect.width;
          const ratio = dir === "rtl" ? 1 - raw : raw;
          if (videoRef.current) videoRef.current.currentTime = ratio * duration;
        }}>
          <div className="absolute inset-x-0 top-1.5 h-1 rounded-full bg-white/25" />
          {bufferedRanges.map((range) => <div key={`${range.start}-${range.end}`} className="absolute top-1.5 h-1 rounded-full bg-white/40" style={{ insetInlineStart: `${range.start / duration * 100}%`, width: `${(range.end - range.start) / duration * 100}%` }} />)}
          <div className="absolute start-0 top-1.5 h-1 rounded-full bg-primary" style={{ width: `${progress}%` }} />
          {chapters.map((chapter) => <span key={chapter.time} title={chapter.label} className="absolute top-0.5 size-3 -translate-x-1/2 rtl:translate-x-1/2 rounded-full bg-white ring-2 ring-black/30" style={{ insetInlineStart: `${duration ? chapter.time / duration * 100 : 0}%` }} />)}
          <span className="absolute top-0 size-4 -translate-x-1/2 rtl:translate-x-1/2 text-primary" style={{ insetInlineStart: `${progress}%` }}><svg viewBox="0 0 24 24" className="size-full"><path d="M4 5 L20 12 L4 19 Q8 12 4 5 Z" fill="currentColor" /></svg></span>
          {hoverTime !== null && <span className="absolute -top-7 -translate-x-1/2 rtl:translate-x-1/2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] tabular-nums" style={{ insetInlineStart: `${duration ? hoverTime / duration * 100 : 0}%` }}>{formatTime(hoverTime)}{chapters.find((chapter) => Math.abs(chapter.time - hoverTime) < 2)?.label ? ` · ${chapters.find((chapter) => Math.abs(chapter.time - hoverTime) < 2)?.label}` : ""}</span>}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button type="button" aria-label={playing ? t("pause") : t("play")} onClick={togglePlay} className="rounded p-1.5 hover:bg-white/15">{playing ? <Pause className="size-4" /> : <Play className="size-4" fill="currentColor" />}</button>
          <button type="button" aria-label={t("skipBack")} onClick={() => seekBy(-10)} className="rounded p-1.5 hover:bg-white/15"><RotateCcw className="size-4" /></button>
          <button type="button" aria-label={t("skipForward")} onClick={() => seekBy(10)} className="rounded p-1.5 hover:bg-white/15"><RotateCw className="size-4" /></button>
          <span className="min-w-20 tabular-nums text-white/80">{formatTime(current)} / {formatTime(duration)}</span>
          <span className="flex-1" />
          {tracks.length > 0 && <button type="button" aria-label={t("captions")} onClick={() => setActiveTrack((value) => (value + 1) % (tracks.length + 1))} className="rounded p-1.5 hover:bg-white/15"><Captions className="size-4" /></button>}
          <label className="flex items-center gap-1.5"><button type="button" aria-label={muted ? t("unmute") : t("mute")} onClick={() => setMuted((value) => !value)} className="rounded p-1.5 hover:bg-white/15">{muted || volume === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}</button><input aria-label={t("volume")} type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => { setVolume(Number(event.target.value)); setMuted(false); }} className="w-16 accent-primary" /></label>
          <label className="relative"><span className="sr-only">{t("playbackRate")}</span><select aria-label={t("playbackRate")} value={rate} onChange={(event) => { const next = Number(event.target.value); setRate(next); if (videoRef.current) videoRef.current.playbackRate = next; }} className="appearance-none bg-transparent pe-4 text-xs outline-none"><option className="text-black" value="0.5">0.5×</option><option className="text-black" value="0.75">0.75×</option><option className="text-black" value="1">1×</option><option className="text-black" value="1.25">1.25×</option><option className="text-black" value="1.5">1.5×</option><option className="text-black" value="2">2×</option></select><ChevronDown className="pointer-events-none absolute end-0 top-0.5 size-3" /></label>
          <button type="button" aria-label={t("fullscreen")} onClick={toggleFullscreen} className="rounded p-1.5 hover:bg-white/15"><Maximize className="size-4" /></button>
        </div>
      </div>
    </div>
  );
}
