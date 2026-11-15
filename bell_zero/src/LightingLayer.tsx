import React from "react";
import { H, W, getLighting } from "./tokens";
import { Scene } from "./types";
import { clamp, rgba, rng } from "./util";

interface Cone { x: number; y: number; w: number; len: number; color: string; a: number }

const conesFor = (scene: Scene, gt: number): Cone[] => {
  const L = getLighting(scene.lighting);
  if (scene.bg === "classroom_door_view") {
    const s = 0.5 + 0.5 * Math.sin(gt * 7.5);
    return [
      { x: 540, y: 0, w: 760, len: 1500, color: "#ff3b3b", a: 0.1 + s * 0.14 },
      { x: 960, y: 120, w: 260, len: 900, color: L.key, a: 0.08 },
    ];
  }
  const tvDanger = scene.bg_monitors.find((m) => m.id === "tv_screen")?.status === "danger";
  return [
    { x: 540, y: 300, w: 900, len: 1100, color: tvDanger ? "#ff4a4a" : "#ffbe3a", a: 0.1 + 0.03 * Math.sin(gt * 9) },
    { x: 150, y: 780, w: 300, len: 700, color: "#ff3b3b", a: Math.sin(gt * 5) > 0.3 ? 0.14 : 0.03 },
    { x: 930, y: 780, w: 300, len: 700, color: "#3a7bff", a: Math.sin(gt * 5) < -0.3 ? 0.14 : 0.03 },
  ];
};

const Particles: React.FC<{ kind: string; gt: number; color: string }> = ({ kind, gt, color }) => {
  if (kind === "none") return null;
  const r = rng(kind.length * 977 + 13);
  const n = kind === "sparks" ? 34 : 70;
  const items = Array.from({ length: n }).map((_, i) => {
    const x0 = r() * W, y0 = r() * H, sp = 0.3 + r() * 1.1, sz = 1.2 + r() * 3.2, ph = r() * 6.28;
    let x = x0, y = y0, op = 0.25 + r() * 0.5;
    if (kind === "dust_motes") {
      x = (x0 + Math.sin(gt * 0.4 * sp + ph) * 60 + gt * 8 * sp) % W;
      y = (y0 + Math.cos(gt * 0.3 * sp + ph) * 50 - gt * 6 * sp + H * 4) % H;
      op *= 0.6 + 0.4 * Math.sin(gt * 1.2 + ph);
    } else if (kind === "ash_drift") {
      x = (x0 + Math.sin(gt * 0.8 * sp + ph) * 80 + gt * 20 * sp) % W;
      y = (y0 + gt * 90 * sp) % H;
    } else {
      x = (x0 + Math.sin(gt * 3 * sp + ph) * 30) % W;
      y = (y0 - gt * 260 * sp + H * 6) % H;
      op *= Math.abs(Math.sin(gt * 14 * sp + ph));
    }
    return { x: (x + W) % W, y: (y + H) % H, sz, op, kind };
  });
  return (
    <g>
      {items.map((p, i) =>
        kind === "sparks" ? (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={p.sz * 0.9} fill="#ffb347" opacity={p.op} />
            <path d={`M${p.x},${p.y} l-3,${p.sz * 9}`} stroke="#ff7a1a" strokeWidth={1.4} opacity={p.op * 0.7} />
          </g>
        ) : (
          <circle key={i} cx={p.x} cy={p.y} r={p.sz} fill={kind === "ash_drift" ? "#b9b2ab" : color} opacity={p.op * (kind === "ash_drift" ? 0.7 : 0.8)} />
        )
      )}
    </g>
  );
};

export const LightingLayer: React.FC<{ scene: Scene; gt: number; frame: number }> = ({ scene, gt, frame }) => {
  const L = getLighting(scene.lighting);
  const pulse = L.pulse ? 0.5 + 0.5 * Math.sin(gt * Math.PI * 2 * L.pulse) : 0;
  const flick = 1 - L.flicker * Math.abs(Math.sin(gt * 31) * Math.sin(gt * 11.3 + 1.2));
  const fog = clamp(scene.atmosphere.fog);
  const cones = conesFor(scene, gt);
  const rr = rng(Math.floor(gt * 24) + 77);
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
      <defs>
        <radialGradient id="vig" cx="0.5" cy="0.45" r="0.78">
          <stop offset="0.45" stopColor="#000" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={L.vignette} />
        </radialGradient>
        <linearGradient id="fogG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#aab4c0" stopOpacity={0} />
          <stop offset="1" stopColor="#aab4c0" stopOpacity={fog * 0.55} />
        </linearGradient>
        <filter id="grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={frame % 97} result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.4 -0.45" />
        </filter>
        <filter id="coneBlur"><feGaussianBlur stdDeviation="22" /></filter>
        {cones.map((c, i) => (
          <linearGradient key={i} id={`cone${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={c.color} stopOpacity={c.a * 1.6} />
            <stop offset="1" stopColor={c.color} stopOpacity={0} />
          </linearGradient>
        ))}
      </defs>

      {/* colour grade wash */}
      <rect width={W} height={H} fill={L.fill} opacity={L.fillOpacity} style={{ mixBlendMode: "multiply" }} />
      <rect width={W} height={H} fill={rgba(L.key, 0.06)} style={{ mixBlendMode: "screen" }} />

      {/* volumetric cones */}
      <g style={{ mixBlendMode: "screen" }} filter="url(#coneBlur)">
        {cones.map((c, i) => (
          <path key={i} d={`M${c.x - 40},${c.y} L${c.x + 40},${c.y} L${c.x + c.w / 2},${c.y + c.len} L${c.x - c.w / 2},${c.y + c.len} Z`} fill={`url(#cone${i})`} />
        ))}
      </g>

      {/* fog bank + drifting wisps */}
      <rect width={W} height={H} fill="url(#fogG)" />
      {[0, 1, 2, 3].map((i) => (
        <ellipse key={i} cx={((gt * (14 + i * 6) + i * 330) % (W + 600)) - 300} cy={1200 + i * 140} rx={420} ry={90} fill="#c5ccd6" opacity={fog * 0.1} filter="url(#coneBlur)" />
      ))}

      {/* particles inside the light */}
      <Particles kind={scene.atmosphere.particles} gt={gt} color={L.key} />

      {/* alarm pulse + flicker */}
      {L.pulse > 0 && <rect width={W} height={H} fill={L.key} opacity={0.05 + pulse * 0.1} style={{ mixBlendMode: "screen" }} />}
      <rect width={W} height={H} fill="#000" opacity={(1 - flick) * 0.9 + (rr() > 0.985 ? 0.12 : 0)} />

      {/* vignette + grain (3%) */}
      <rect width={W} height={H} fill="url(#vig)" />
      <rect width={W} height={H} filter="url(#grain)" opacity={0.03} />
    </svg>
  );
};

/** Chromatic aberration pulse for punch_zoom. `amount` in px. */
export const ChromaticDefs: React.FC<{ amount: number }> = ({ amount }) => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    <filter id="ca" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
      <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
      <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
      <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
      <feOffset in="r" dx={-amount} dy={0} result="ro" />
      <feOffset in="b" dx={amount} dy={0} result="bo" />
      <feBlend in="ro" in2="g" mode="screen" result="rg" />
      <feBlend in="rg" in2="bo" mode="screen" />
    </filter>
  </svg>
);
