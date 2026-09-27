'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Decorative gold particle field for hero sections.
 *
 * This is ornament, so it is written to cost as little as possible and to get
 * out of the way when it is not wanted:
 *
 *   - `prefers-reduced-motion` renders ONE static frame and never starts the
 *     animation loop. Motion is the accessibility problem here, not the dots,
 *     so the visual survives while the movement does not.
 *   - An IntersectionObserver stops the loop once the hero scrolls off screen,
 *     and `visibilitychange` stops it on a backgrounded tab. Neither costs
 *     battery for something nobody is looking at.
 *   - Particle count scales with area and is capped, so a 4K monitor does not
 *     get thousands of them.
 *   - Device pixel ratio is clamped to 2. Beyond that the extra pixels are
 *     invisible and the fill cost is real.
 *   - Movement is integrated against elapsed time, so the drift looks the same
 *     at 60Hz and 144Hz instead of running twice as fast.
 *
 * Nothing here is interactive or announced, so the canvas is aria-hidden and
 * the whole layer is pointer-events-none.
 */

type Particle = {
  x: number;
  y: number;
  /** Radius in CSS pixels. */
  r: number;
  /** Upward speed, CSS pixels per second. */
  vy: number;
  /** Horizontal sway amplitude and rate. */
  sway: number;
  swayRate: number;
  phase: number;
  alpha: number;
  /** 0 = dim dust, 1 = bright ember. Drives colour and glow. */
  heat: number;
};

const DENSITY = 1 / 16000; // particles per square CSS pixel
const MAX_PARTICLES = 90;
const MIN_PARTICLES = 18;
/** Particles closer than this get a connecting hairline. */
const LINK_DISTANCE = 130;

function createParticle(width: number, height: number, seeded: boolean): Particle {
  const heat = Math.random() ** 2; // mostly dust, a few embers
  return {
    x: Math.random() * width,
    // On first fill, scatter through the whole box. Later respawns enter from
    // the bottom so the field refills without dots appearing mid-air.
    y: seeded ? Math.random() * height : height + Math.random() * 40,
    r: 0.7 + heat * 1.6,
    vy: 6 + Math.random() * 16,
    sway: 4 + Math.random() * 14,
    swayRate: 0.15 + Math.random() * 0.35,
    phase: Math.random() * Math.PI * 2,
    alpha: 0.18 + heat * 0.45,
    heat,
  };
}

export function ParticleField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return; // very old browser: the layer simply stays blank

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // The helpers below are arrow consts rather than function declarations so
    // that the null checks above still apply inside them. A hoisted function
    // could in principle run before those checks, so TypeScript discards the
    // narrowing for one, and every use of `canvas` and `ctx` would then need a
    // non-null assertion.

    const particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let lastTime = 0;
    let onScreen = true;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      // Draw in CSS pixels; the transform handles the retina scale-up.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const target = Math.min(
        MAX_PARTICLES,
        Math.max(MIN_PARTICLES, Math.round(width * height * DENSITY)),
      );
      // Keep existing particles across a resize so the field does not visibly
      // reset when a phone rotates or the address bar collapses.
      if (particles.length > target) {
        particles.length = target;
      } else {
        while (particles.length < target) particles.push(createParticle(width, height, true));
      }
      for (const p of particles) {
        if (p.x > width) p.x = Math.random() * width;
        if (p.y > height) p.y = Math.random() * height;
      }
    };

    const draw = (elapsed: number) => {
      ctx.clearRect(0, 0, width, height);

      // Hairlines first so the dots sit on top of them.
      ctx.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        const ax = a.x + Math.sin(elapsed * a.swayRate + a.phase) * a.sway;
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const bx = b.x + Math.sin(elapsed * b.swayRate + b.phase) * b.sway;
          const dx = ax - bx;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;
          if (distSq > LINK_DISTANCE * LINK_DISTANCE) continue;
          const closeness = 1 - Math.sqrt(distSq) / LINK_DISTANCE;
          ctx.strokeStyle = 'rgba(212, 160, 60, ' + closeness * 0.1 + ')';
          ctx.beginPath();
          ctx.moveTo(ax, a.y);
          ctx.lineTo(bx, b.y);
          ctx.stroke();
        }
      }

      for (const p of particles) {
        const x = p.x + Math.sin(elapsed * p.swayRate + p.phase) * p.sway;
        // Fade out over the top third so particles dissolve instead of
        // vanishing abruptly at the edge.
        const fade = p.y < height * 0.3 ? Math.max(0, p.y / (height * 0.3)) : 1;
        const alpha = p.alpha * fade;
        if (alpha <= 0.01) continue;

        if (p.heat > 0.55) {
          // Embers get a soft halo. Restricted to the few bright ones because
          // a radial gradient per particle is the expensive part.
          const glow = ctx.createRadialGradient(x, p.y, 0, x, p.y, p.r * 5);
          glow.addColorStop(0, 'rgba(242, 216, 154, ' + alpha * 0.5 + ')');
          glow.addColorStop(1, 'rgba(242, 216, 154, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(x, p.y, p.r * 5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Embers are gold; the dust picks up the purple so the field reads as
        // part of the background rather than glitter on top of it.
        ctx.fillStyle =
          p.heat > 0.55
            ? 'rgba(242, 216, 154, ' + alpha + ')'
            : 'rgba(158, 143, 192, ' + alpha + ')';
        ctx.beginPath();
        ctx.arc(x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const step = (now: number) => {
      // Clamp the delta so returning to a backgrounded tab does not teleport
      // every particle off the top of the canvas.
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      for (const p of particles) {
        p.y -= p.vy * dt;
        if (p.y < -p.r * 6) Object.assign(p, createParticle(width, height, false));
      }

      draw(now / 1000);
      frame = requestAnimationFrame(step);
    };

    const start = () => {
      if (frame || reduceMotion || !onScreen || document.hidden) return;
      lastTime = performance.now();
      frame = requestAnimationFrame(step);
    };

    const stop = () => {
      if (!frame) return;
      cancelAnimationFrame(frame);
      frame = 0;
    };

    resize();

    if (reduceMotion) {
      draw(0); // one static frame, no loop
    } else {
      start();
    }

    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (reduceMotion) draw(0);
    });
    resizeObserver.observe(canvas);

    const intersectionObserver = new IntersectionObserver((entries) => {
      onScreen = entries[0]?.isIntersecting ?? true;
      if (onScreen) start();
      else stop();
    });
    intersectionObserver.observe(canvas);

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 size-full', className)}
    />
  );
}
