"use client";

import { useEffect, useRef } from "react";

/* ---------- Tweak these ---------- */
const CONFIG = {
  stars: { desktop: 130, phone: 70 },
  drift: { x: -0.94, y: -0.34 }, // stars drift toward the upper left
  driftSpeed: { far: 6, near: 14 }, // pixels per second (far stars slower)
  planets: { desktop: 3, phone: 2 },
  shootingStarEvery: [7, 15], // seconds between shooting stars
  cometEvery: [35, 60], // seconds between comets
  parallax: 12, // max pointer parallax in px
};

const TAU = Math.PI * 2;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// Index-matched palettes (repeats make white stars more common).
const DARK_COLORS = [
  "#FFFFFF",
  "#FFFFFF",
  "#FFFFFF",
  "#FFFFFF",
  "#F4F7FF",
  "#F4F7FF",
  "#5CF2C0",
  "#7AB0FF",
  "#FFB65C",
];
const LIGHT_COLORS = [
  "#2F5BD3",
  "#067A58",
  "#4A5478",
  "#2F5BD3",
  "#067A58",
  "#4A5478",
  "#067A58",
  "#2F5BD3",
  "#C2540A",
];

const PLANET_TYPES = [
  { c1: "#E8896A", c2: "#7A2E1A", bands: false, ring: false }, // rust
  { c1: "#A9CBFF", c2: "#2A4A8C", bands: false, ring: true }, // ice, ringed
  { c1: "#7BF5D0", c2: "#0E6B55", bands: true, ring: false }, // mint gas
  { c1: "#FFC986", c2: "#8A4B14", bands: true, ring: false }, // amber gas
];

type Star = {
  x: number;
  y: number;
  z: number;
  r: number;
  color: number;
  base: number;
  tw: number;
  phase: number;
  spikes: boolean;
};
type Planet = {
  x: number;
  y: number;
  z: number;
  r: number;
  kind: number;
  moon: boolean;
  moonAngle: number;
};
type Streak = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  len: number;
  comet: boolean;
};

const sprites = new Map<string, HTMLCanvasElement>();
function glowSprite(color: string) {
  let c = sprites.get(color);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, rgba("#FFFFFF", 1));
  grad.addColorStop(0.12, rgba(color, 0.95));
  grad.addColorStop(0.35, rgba(color, 0.28));
  grad.addColorStop(1, rgba(color, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  sprites.set(color, c);
  return c;
}

function readDark() {
  const el = document.documentElement;
  if (el.classList.contains("dark")) return true;
  if (el.classList.contains("light")) return false;
  const dt = el.getAttribute("data-theme");
  if (dt) return dt === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function Particles({ enabled = true }: { enabled?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let w = 0,
      h = 0,
      raf = 0,
      last = performance.now(),
      time = 0;
    let dark = readDark();
    let stars: Star[] = [];
    let planets: Planet[] = [];
    let streaks: Streak[] = [];
    let nextStar = 3; // first shooting star soon, so it is seen
    let nextComet = 14;
    const mouse = { tx: 0, ty: 0, x: 0, y: 0 };

    const seed = () => {
      const phone = w < 600;
      const n = phone ? CONFIG.stars.phone : CONFIG.stars.desktop;
      stars = Array.from({ length: n }, () => {
        const roll = Math.random();
        const z = roll < 0.55 ? 0.35 : roll < 0.85 ? 0.65 : 1;
        return {
          x: rand(0, w),
          y: rand(0, h),
          z,
          r: rand(0.5, 1) * (0.8 + z * 1.2),
          color: Math.floor(rand(0, DARK_COLORS.length)),
          base: rand(0.45, 0.95) * (0.6 + 0.4 * z),
          tw: rand(0.8, 2.6),
          phase: rand(0, TAU),
          spikes: z === 1 && Math.random() < 0.45,
        };
      });
      const pn = phone ? CONFIG.planets.phone : CONFIG.planets.desktop;
      const offset = Math.floor(rand(0, PLANET_TYPES.length));
      planets = Array.from({ length: pn }, (_, i) => ({
        x: rand(0, w),
        y: rand(0, h),
        z: rand(0.4, 0.9),
        r: rand(10, 26),
        kind: (offset + i) % PLANET_TYPES.length,
        moon: i === 0,
        moonAngle: rand(0, TAU),
      }));
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      if (reduced) draw();
    };

    const spawn = (comet: boolean) => {
      const angle = rand(2.55, 2.85); // moves left and down
      const speed = comet ? rand(140, 200) : rand(750, 1000);
      streaks.push({
        x: rand(comet ? 0.55 : 0.35, comet ? 1 : 1.05) * w,
        y: rand(-0.05, comet ? 0.35 : 0.4) * h,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        age: 0,
        life: comet ? rand(7, 10) : rand(0.9, 1.3),
        len: comet ? rand(260, 340) : rand(130, 220),
        comet,
      });
    };

    const update = (dt: number) => {
      const { x: dx, y: dy } = CONFIG.drift;
      for (const s of stars) {
        const t = (s.z - 0.35) / 0.65;
        const sp =
          CONFIG.driftSpeed.far +
          (CONFIG.driftSpeed.near - CONFIG.driftSpeed.far) * t;
        s.x += dx * sp * dt;
        s.y += dy * sp * dt;
        if (s.x < -10) {
          s.x = w + 10;
          s.y = rand(0, h);
        }
        if (s.y < -10) {
          s.y = h + 10;
          s.x = rand(0, w);
        }
      }
      for (const p of planets) {
        const sp = 2.5 + 4 * p.z;
        p.x += dx * sp * dt;
        p.y += dy * sp * dt;
        const m = p.r * 3;
        if (p.x < -m) {
          p.x = w + m;
          p.y = rand(0, h);
        }
        if (p.y < -m) {
          p.y = h + m;
          p.x = rand(0, w);
        }
      }
      nextStar -= dt;
      nextComet -= dt;
      if (nextStar <= 0) {
        spawn(false);
        if (Math.random() < 0.2) spawn(false);
        nextStar = rand(
          CONFIG.shootingStarEvery[0],
          CONFIG.shootingStarEvery[1],
        );
      }
      if (nextComet <= 0) {
        spawn(true);
        nextComet = rand(CONFIG.cometEvery[0], CONFIG.cometEvery[1]);
      }
      streaks = streaks.filter((s) => {
        s.age += dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        return s.age < s.life && s.x > -400 && s.y < h + 400;
      });
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
    };

    const drawStar = (s: Star) => {
      const col = (dark ? DARK_COLORS : LIGHT_COLORS)[s.color];
      const tw = reduced ? 0.7 : 0.5 + 0.5 * Math.sin(time * s.tw + s.phase);
      const a = dark
        ? s.base * (0.4 + 0.6 * tw)
        : s.base * 0.55 * (0.5 + 0.5 * tw);
      const x = s.x + mouse.x * CONFIG.parallax * s.z;
      const y = s.y + mouse.y * CONFIG.parallax * s.z;
      const size = s.r * (dark ? 7 : 5) * (0.85 + 0.3 * tw);
      ctx.globalAlpha = a;
      ctx.drawImage(glowSprite(col), x - size / 2, y - size / 2, size, size);
      if (s.spikes) {
        const len = s.r * 5 * (0.7 + 0.3 * tw);
        ctx.globalAlpha = a * 0.7;
        ctx.strokeStyle = col;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(x - len, y);
        ctx.lineTo(x + len, y);
        ctx.moveTo(x, y - len);
        ctx.lineTo(x, y + len);
        ctx.stroke();
      }
    };

    const drawPlanet = (p: Planet) => {
      const k = PLANET_TYPES[p.kind];
      const r = p.r;
      ctx.save();
      ctx.translate(
        p.x + mouse.x * CONFIG.parallax * p.z,
        p.y + mouse.y * CONFIG.parallax * p.z,
      );
      ctx.globalAlpha = dark ? 0.92 : 0.5;
      const halo = ctx.createRadialGradient(0, 0, r * 0.9, 0, 0, r * 1.7);
      halo.addColorStop(0, rgba(k.c1, dark ? 0.28 : 0.15));
      halo.addColorStop(1, rgba(k.c1, 0));
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.7, 0, TAU);
      ctx.fill();
      const ring = (from: number, to: number) => {
        ctx.save();
        ctx.rotate(-0.35);
        ctx.strokeStyle = rgba(k.c1, 0.55);
        ctx.lineWidth = r * 0.16;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 1.9, r * 0.55, 0, from, to);
        ctx.stroke();
        ctx.restore();
      };
      if (k.ring) ring(Math.PI, TAU); // back half of the ring
      const body = ctx.createRadialGradient(
        -r * 0.4,
        -r * 0.4,
        r * 0.1,
        0,
        0,
        r * 1.05,
      );
      body.addColorStop(0, k.c1);
      body.addColorStop(1, k.c2);
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.fill();
      if (k.bands) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, TAU);
        ctx.clip();
        ctx.rotate(-0.25);
        ctx.fillStyle = rgba(k.c2, 0.22);
        for (let i = 0; i < 5; i++)
          ctx.fillRect(-r, -r + (i * 2 + 0.6) * (r / 5), 2 * r, r / 9);
        ctx.restore();
      }
      const shade = ctx.createRadialGradient(
        -r * 0.45,
        -r * 0.45,
        r * 0.55,
        -r * 0.2,
        -r * 0.2,
        r * 1.35,
      );
      shade.addColorStop(0, "rgba(0,0,0,0)");
      shade.addColorStop(1, dark ? "rgba(3,6,18,0.7)" : "rgba(18,26,51,0.3)");
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.fill();
      if (k.ring) ring(0, Math.PI); // front half of the ring
      if (p.moon) {
        const a = p.moonAngle + time * 0.25;
        ctx.fillStyle = dark ? rgba("#DCE6FF", 0.9) : rgba("#4A5478", 0.7);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r * 1.9, Math.sin(a) * r * 0.6, r * 0.2, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    };

    const drawStreak = (s: Streak) => {
      const sp = Math.hypot(s.vx, s.vy);
      const dirAngle = Math.atan2(s.vy / sp, s.vx / sp);
      const env = Math.min(1, s.age / 0.2, (s.life - s.age) / 0.4);
      if (env <= 0) return;
      const tails = s.comet
        ? [
            {
              len: s.len,
              w: 3,
              c: dark ? "#7AB0FF" : "#2F5BD3",
              off: 0,
              a: 0.9,
            },
            {
              len: s.len * 0.6,
              w: 7,
              c: dark ? "#FFB65C" : "#C2540A",
              off: 0.12,
              a: 0.5,
            },
          ]
        : [
            {
              len: s.len,
              w: 2,
              c: dark ? "#FFFFFF" : "#2F5BD3",
              off: 0,
              a: 0.95,
            },
          ];
      ctx.globalAlpha = 1;
      ctx.lineCap = "round";
      for (const t of tails) {
        const ang = dirAngle + t.off;
        const tx = s.x - Math.cos(ang) * t.len,
          ty = s.y - Math.sin(ang) * t.len;
        const g = ctx.createLinearGradient(s.x, s.y, tx, ty);
        g.addColorStop(0, rgba(t.c, t.a * env));
        g.addColorStop(1, rgba(t.c, 0));
        ctx.strokeStyle = g;
        ctx.lineWidth = t.w;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      }
      const size = s.comet ? 30 : 16;
      ctx.globalAlpha = env;
      ctx.drawImage(
        glowSprite(dark ? "#FFFFFF" : "#2F5BD3"),
        s.x - size / 2,
        s.y - size / 2,
        size,
        size,
      );
      ctx.globalAlpha = 1;
    };

    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) drawStar(s);
      for (const p of planets) drawPlanet(p);
      for (const s of streaks) drawStreak(s);
      ctx.globalAlpha = 1;
    }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      time += dt;
      update(dt);
      draw();
    };

    const onVisibility = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else if (!reduced) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    const onPointer = (e: PointerEvent) => {
      mouse.tx = (e.clientX / w) * 2 - 1;
      mouse.ty = (e.clientY / h) * 2 - 1;
    };

    // Re-read the theme whenever the page switches between light and dark.
    const mo = new MutationObserver(() => {
      dark = readDark();
      if (reduced) draw();
    });
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    let resizeTimer: number;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 150);
    };

    resize();
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    if (!reduced) {
      window.addEventListener("pointermove", onPointer, { passive: true });
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      mo.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
