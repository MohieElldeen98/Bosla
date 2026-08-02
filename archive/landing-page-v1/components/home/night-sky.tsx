"use client";

import { useEffect, useRef } from "react";

// White core with a touch of the hero gradient's own cyan (#34e0e8) mixed
// in, so the sky reads as part of the same brand gradient rather than a
// generic starfield dropped on top of it.
const STAR_TINTS = ["255,255,255", "255,255,255", "255,255,255", "205,239,251", "127,236,240"];
const METEOR_HEAD = "255,255,255";
const METEOR_TAIL = "127,236,240";

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

interface Star {
  x: number;
  y: number;
  r: number;
  base: number;
  amp: number;
  speed: number;
  phase: number;
  tint: string;
}

interface Meteor {
  born: number;
  life: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  len: number;
}

function buildStars(w: number, h: number): Star[] {
  const count = Math.max(50, Math.min(150, Math.round((w * h) / 9000)));
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      r: rand(0.4, 1.7),
      base: rand(0.22, 0.65),
      amp: rand(0.18, 0.35),
      speed: rand(0.25, 0.9),
      phase: rand(0, Math.PI * 2),
      tint: STAR_TINTS[(Math.random() * STAR_TINTS.length) | 0],
    });
  }
  return stars;
}

/**
 * Hero-only decoration: faint twinkling stars + an occasional meteor over
 * `.hero-gradient`. Zero-JS-cost when idle — only runs the rAF loop while
 * the hero is actually on screen and the tab is visible, and skips the
 * loop entirely under `prefers-reduced-motion` (stars render once, static).
 */
export function NightSky() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !section || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let w = 0;
    let h = 0;
    // Guards against a ResizeObserver feedback loop: writing `canvas.width`/
    // `canvas.height` resets the bitmap (and clears anything drawn), and on
    // some layout engines that write itself perturbs sub-pixel measurements
    // enough to re-trigger the observer. Skipping the write when the
    // rounded size hasn't actually changed breaks that loop at the source.
    let lastCanvasW = -1;
    let lastCanvasH = -1;
    let stars: Star[] = [];
    let meteor: Meteor | null = null;
    let nextMeteorAt = performance.now() + rand(3000, 6000);
    let visible = !reduced;
    let rafId: number | null = null;

    function drawStar(s: Star, alpha: number) {
      ctx!.beginPath();
      ctx!.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
      ctx!.fillStyle = `rgba(${s.tint},${alpha.toFixed(3)})`;
      ctx!.fill();
      if (s.r > 1.2 && alpha > 0.5) {
        ctx!.beginPath();
        ctx!.arc(s.x * w, s.y * h, s.r * 2.6, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${s.tint},${(alpha * 0.08).toFixed(3)})`;
        ctx!.fill();
      }
    }

    function drawStatic() {
      ctx!.clearRect(0, 0, w, h);
      for (const s of stars) drawStar(s, s.base);
    }

    function size() {
      const rect = section!.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      w = rect.width;
      h = rect.height;
      const nextCanvasW = Math.round(w * dpr);
      const nextCanvasH = Math.round(h * dpr);
      if (nextCanvasW !== lastCanvasW || nextCanvasH !== lastCanvasH) {
        lastCanvasW = nextCanvasW;
        lastCanvasH = nextCanvasH;
        canvas!.width = nextCanvasW;
        canvas!.height = nextCanvasH;
        ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      if (!stars.length) stars = buildStars(w, h);
      if (reduced) drawStatic();
    }

    function spawnMeteor(now: number) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      const angle = rand(0.45, 0.75);
      const speed = rand(0.38, 0.6);
      const scale = w / 900 + 0.6;
      meteor = {
        born: now,
        life: rand(900, 1500),
        x: rand(0.15, 0.85) * w,
        y: rand(0.05, 0.35) * h,
        vx: Math.cos(angle) * speed * dir * scale,
        vy: Math.sin(angle) * speed * scale,
        len: rand(90, 170),
      };
      nextMeteorAt = now + rand(4000, 9000);
    }

    function drawMeteor(now: number) {
      if (!meteor) {
        if (now >= nextMeteorAt) spawnMeteor(now);
        return;
      }
      const t = (now - meteor.born) / meteor.life;
      if (t >= 1) {
        meteor = null;
        return;
      }
      const alpha = Math.sin(Math.PI * t) * 0.9;
      const elapsed = now - meteor.born;
      const x = meteor.x + meteor.vx * elapsed;
      const y = meteor.y + meteor.vy * elapsed + 0.00012 * elapsed * elapsed;
      const dirLen = Math.hypot(meteor.vx, meteor.vy) || 1;
      const tx = x - (meteor.vx / dirLen) * meteor.len;
      const ty = y - (meteor.vy / dirLen) * meteor.len;

      const grad = ctx!.createLinearGradient(x, y, tx, ty);
      grad.addColorStop(0, `rgba(${METEOR_HEAD},${alpha.toFixed(3)})`);
      grad.addColorStop(0.3, `rgba(${METEOR_TAIL},${(alpha * 0.55).toFixed(3)})`);
      grad.addColorStop(1, `rgba(${METEOR_TAIL},0)`);
      ctx!.strokeStyle = grad;
      ctx!.lineWidth = 1.6;
      ctx!.lineCap = "round";
      ctx!.beginPath();
      ctx!.moveTo(x, y);
      ctx!.lineTo(tx, ty);
      ctx!.stroke();

      const haloR = 7.5;
      const halo = ctx!.createRadialGradient(x, y, 0, x, y, haloR);
      halo.addColorStop(0, `rgba(${METEOR_TAIL},${(alpha * 0.55).toFixed(3)})`);
      halo.addColorStop(1, `rgba(${METEOR_TAIL},0)`);
      ctx!.fillStyle = halo;
      ctx!.beginPath();
      ctx!.arc(x, y, haloR, 0, Math.PI * 2);
      ctx!.fill();

      ctx!.beginPath();
      ctx!.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx!.fillStyle = `rgba(${METEOR_HEAD},${alpha.toFixed(3)})`;
      ctx!.fill();
    }

    function frame(now: number) {
      rafId = null;
      if (!visible) return;
      ctx!.clearRect(0, 0, w, h);
      const t = now / 1000;
      for (const s of stars) {
        const alpha = s.base + s.amp * Math.sin(t * s.speed + s.phase);
        drawStar(s, Math.max(0.05, alpha));
      }
      drawMeteor(now);
      rafId = requestAnimationFrame(frame);
    }

    function play() {
      if (reduced || rafId !== null) return;
      rafId = requestAnimationFrame(frame);
    }
    function pause() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    let io: IntersectionObserver | null = null;
    if (!reduced && typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting && !document.hidden;
        if (visible) play();
        else pause();
      }, { threshold: 0.05 });
      io.observe(section);
    }

    function onVisibilityChange() {
      if (document.hidden) pause();
      else if (visible) play();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(size);
      ro.observe(section);
    } else {
      window.addEventListener("resize", size);
    }

    size();
    if (!reduced) play();
    else drawStatic();

    return () => {
      pause();
      io?.disconnect();
      ro?.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("resize", size);
    };
  }, []);

  return (
    <>
      <div className="night-sky-nebula" aria-hidden="true" />
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 size-full" />
    </>
  );
}
