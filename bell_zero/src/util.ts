import { Easing } from "./types";

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const ease = (kind: Easing, t: number): number => {
  const x = clamp(t);
  switch (kind) {
    case "easeIn": return x * x * x;
    case "easeOut": return 1 - Math.pow(1 - x, 3);
    case "easeInOut": return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    default: return x;
  }
};

/** Deterministic PRNG (mulberry32) so every render is frame-identical. */
export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const shade = (hex: string, amt: number): string => {
  const [r, g, b] = hexToRgb(hex);
  const f = (c: number) => Math.round(clamp(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt), 0, 255));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
};
export const rgba = (hex: string, a: number): string => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};

export const fmtClock = (startHHMM: string, tSeconds: number): string => {
  const [h, m] = startHHMM.split(":").map(Number);
  // 1 episode second == 1 in-world minute (14:15 at t=0 -> 14:37 at t=22)
  const total = h * 60 + m + Math.floor(tSeconds);
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};
