import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

export const W = 1080;
export const H = 1920;
export const FPS = 30;

/** Safe zones for Reels/Shorts/TikTok UI overlays. */
export const SAFE = { top: 150, bottom: 460, side: 60 };

const anton = loadAnton();
const mono = loadMono();
export const FONT_DISPLAY = `${anton.fontFamily}, Impact, 'Arial Black', sans-serif`;
export const FONT_MONO = `${mono.fontFamily}, 'Courier New', monospace`;

export const COLORS = {
  white: "#ffffff",
  red: "#ff2d3a",
  yellow: "#ffd23f",
  ink: "#07090d",
  hudBg: "rgba(6,10,16,0.72)",
  ok: "#4ade80",
  warning: "#ffd23f",
  danger: "#ff2d3a",
};

export interface Lighting {
  key: string;      // key-light / rim colour
  fill: string;     // ambient wash
  fillOpacity: number;
  vignette: number;
  wall: [string, string];   // wall gradient top/bottom
  floor: [string, string];
  flicker: number;  // 0..1 flicker amplitude
  pulse: number;    // Hz of alarm pulsing, 0 = none
}

export const LIGHTING: Record<string, Lighting> = {
  night_cold:      { key: "#5bc0eb", fill: "#0a1a33", fillOpacity: 0.30, vignette: 0.52, wall: ["#18263a", "#0e1624"], floor: ["#1a2230", "#0a0f18"], flicker: 0.06, pulse: 0 },
  emergency_amber: { key: "#f5b301", fill: "#3a1e00", fillOpacity: 0.24, vignette: 0.50, wall: ["#3a2b1c", "#241a10"], floor: ["#2e2214", "#150f08"], flicker: 0.14, pulse: 1.2 },
  alarm_red:       { key: "#ff3b3b", fill: "#3a0508", fillOpacity: 0.27, vignette: 0.56, wall: ["#3a1519", "#220a0d"], floor: ["#2a1013", "#12060a"], flicker: 0.10, pulse: 1.8 },
  cctv_green:      { key: "#5dffa0", fill: "#04200f", fillOpacity: 0.28, vignette: 0.58, wall: ["#14281d", "#0b1a12"], floor: ["#11221a", "#08120d"], flicker: 0.16, pulse: 0 },
};

export const getLighting = (id: string): Lighting => LIGHTING[id] ?? LIGHTING.night_cold;
