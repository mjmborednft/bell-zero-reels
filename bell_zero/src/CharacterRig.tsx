import React from "react";
import { CharBible } from "./types";
import { clamp, hexToRgb, rgba, shade } from "./util";

/**
 * Procedural high-detail 2.5D character rig. Waist-up, 600x900 rig space.
 * Anchor (300, 880) = waist centre. 35+ independent SVG layers:
 *   back hair, neck, neck shadow, torso, torso shading, creases, collar/hood,
 *   pockets/zip/buttons/drawstrings, straps/lanyard, pendant, arms (2 segments x2
 *   + shading), hands w/ individual fingers, props, head/jaw, cheek shadow,
 *   nose bridge/tip/nostrils, ears, sclera, iris, pupil, catch-lights, upper+lower
 *   lids, brows, lips/mouth/teeth/tongue, scar, front hair, strands, glasses, rim light.
 */

type HandPose = "relaxed" | "fist" | "point" | "grip" | "open";
interface ArmPose { a1: number; a2: number; hand: HandPose }
interface Pose { L: ArmPose; R: ArmPose; tilt: number; dip: number; lookX: number; lookY: number; bob: number }
interface Emo { browInner: number; browY: number; eyeOpen: number; mouthCurve: number; mouthBase: number; pupil: number; tremble: number }

const EMO: Record<string, Emo> = {
  neutral:    { browInner: 0,  browY: 0,  eyeOpen: 1,    mouthCurve: 0,  mouthBase: 0,    pupil: 1,   tremble: 0 },
  afraid:     { browInner: 14, browY: -4, eyeOpen: 1.25, mouthCurve: -4, mouthBase: 0.22, pupil: 0.8, tremble: 1.2 },
  worried:    { browInner: 10, browY: 0,  eyeOpen: 1.05, mouthCurve: -2, mouthBase: 0.04, pupil: 1,   tremble: 0.5 },
  determined: { browInner: -9, browY: 4,  eyeOpen: 0.82, mouthCurve: -1, mouthBase: 0,    pupil: 1,   tremble: 0.15 },
  panicked:   { browInner: 16, browY: -6, eyeOpen: 1.35, mouthCurve: -6, mouthBase: 0.38, pupil: 0.7, tremble: 2 },
};

const SH_L = { x: 172, y: 450 };
const SH_R = { x: 428, y: 450 };
const L1 = 140;
const L2 = 135;

const poseFor = (action: string, f: number, fps: number): Pose => {
  const t = f / fps;
  const sw = Math.sin(t * 5.2);
  switch (action) {
    case "inspect":
      return { L: { a1: -25, a2: 120, hand: "grip" }, R: { a1: 25, a2: -120, hand: "grip" }, tilt: -2, dip: 8, lookX: 0, lookY: 0.75, bob: Math.sin(t * 1.8) * 2 };
    case "point":
      return { L: { a1: -10, a2: -6, hand: "relaxed" }, R: { a1: 80 + Math.sin(t * 3) * 1.5, a2: 88, hand: "point" }, tilt: 3, dip: 0, lookX: 0.6, lookY: -0.05, bob: Math.sin(t * 1.5) * 2 };
    case "walk":
      return { L: { a1: -14 + sw * 20, a2: -6 + sw * 12, hand: "relaxed" }, R: { a1: 14 - sw * 20, a2: 6 - sw * 12, hand: "fist" }, tilt: sw * 1.5, dip: 0, lookX: 0.5, lookY: 0, bob: Math.abs(sw) * 9 };
    case "shock":
      return { L: { a1: -35, a2: 160, hand: "open" }, R: { a1: 35, a2: -160, hand: "open" }, tilt: -4, dip: -10, lookX: 0, lookY: -0.1, bob: Math.sin(t * 9) * 1.6 };
    default:
      return { L: { a1: -12, a2: -8, hand: "relaxed" }, R: { a1: 12, a2: 8, hand: "relaxed" }, tilt: 0, dip: 0, lookX: 0.1, lookY: 0, bob: Math.sin(t * 1.6) * 2.5 };
  }
};

const joint = (s: { x: number; y: number }, a1: number, a2: number) => {
  const r1 = (a1 * Math.PI) / 180;
  const r2 = (a2 * Math.PI) / 180;
  const e = { x: s.x + L1 * Math.sin(r1), y: s.y + L1 * Math.cos(r1) };
  const w = { x: e.x + L2 * Math.sin(r2), y: e.y + L2 * Math.cos(r2) };
  return { e, w };
};

interface Look {
  skin: string;
  skinShade: string;
  hair: string;
  iris: string;
  jawW: number;
  cheek: number;
  top: string;       // main garment
  topDark: string;
  accent: string;
}

const lookFor = (c: CharBible): Look => {
  const p = c.palette;
  if (c.id === "teacher_harper") {
    return { skin: p.skin, skinShade: shade(p.skin, -0.28), hair: "#4a2f22", iris: "#3a6b5c", jawW: 44, cheek: 82, top: p.uniform, topDark: shade(p.uniform, -0.4), accent: p.accent };
  }
  return { skin: p.skin, skinShade: shade(p.skin, -0.3), hair: "#1b1410", iris: "#4b7ea8", jawW: 56, cheek: 90, top: p.hoodie, topDark: shade(p.hoodie, -0.45), accent: p.accent };
};

interface Props {
  bible: CharBible;
  uid: string;
  frame: number;
  fps: number;
  action: string;
  emotion: string;
  mouthAmp: number;     // 0..1 voice amplitude driving lip-sync
  keyColor: string;     // scene key-light colour for rim light
  props: string[];
  flip: boolean;        // true = faces screen-left
  scale: number;
  phoneGlow?: string;   // colour of the phone screen glow when held
}

export const RIG_W = 600;
export const RIG_H = 900;
export const RIG_ANCHOR = { x: 300, y: 880 };

export const CharacterRig: React.FC<Props> = ({ bible, uid, frame, fps, action, emotion, mouthAmp, keyColor, props, flip, scale, phoneGlow }) => {
  const look = lookFor(bible);
  const emo = EMO[emotion] ?? EMO.neutral;
  const pose = poseFor(action, frame, fps);
  const isHero = bible.id === "hero_student_m";
  const t = frame / fps;

  // blink every 3.5 s, offset per character, 5-frame blink
  const period = Math.round(3.5 * fps);
  const off = isHero ? 14 : 41;
  const bf = (frame + off) % period;
  const blink = bf < 5 ? Math.abs(Math.sin((bf / 5) * Math.PI)) : 0;
  const eyeOpen = clamp(emo.eyeOpen * (1 - blink * 0.95), 0.04, 1.5);

  // fear tremble
  const jx = Math.sin(t * 47 + (isHero ? 1 : 3)) * emo.tremble;
  const jy = Math.cos(t * 39 + (isHero ? 2 : 5)) * emo.tremble * 0.7;

  // mouth openness: voice amplitude (hero only is the narrating voice) + emotion base
  const open = clamp(emo.mouthBase + (isHero ? mouthAmp * 0.95 : 0), 0, 1);

  const breath = 1 + Math.sin(t * 2.2) * 0.006;
  const L = joint(SH_L, pose.L.a1, pose.L.a2);
  const R = joint(SH_R, pose.R.a1, pose.R.a2);

  const id = (n: string) => `${uid}-${n}`;
  const pg = phoneGlow ?? "#ff2d3a";
  const pg2 = shade(pg, 0.35);
  const skin = look.skin;
  const hairC = look.hair;

  const [kr, kg, kb] = hexToRgb(keyColor);
  const rimDx = flip ? -3 : 3;

  const lookX = clamp(pose.lookX, -1, 1) * 5;
  const lookY = clamp(pose.lookY, -1, 1) * 4;

  /* ---------- sub-renderers ---------- */
  const brow = (side: -1 | 1) => {
    const xo = side * 66, xm = side * 40, xi = side * 14;
    const yb = -46 + emo.browY;
    const yi = yb - emo.browInner * 0.9;
    const yo = yb + emo.browInner * 0.25 + 2;
    const ym = (yi + yo) / 2 - 5;
    return (
      <g key={`brow${side}`}>
        <path d={`M${xo},${yo} Q${xm},${ym - 3} ${xi},${yi}`} stroke={hairC} strokeWidth={10} strokeLinecap="round" fill="none" />
        <path d={`M${xo - side * 6},${yo + 1} Q${xm},${ym} ${xi + side * 4},${yi + 1}`} stroke={rgba("#000000", 0.35)} strokeWidth={3} strokeLinecap="round" fill="none" />
      </g>
    );
  };

  const eye = (side: -1 | 1) => {
    const cx = side * 38;
    const cy = -8;
    const o = eyeOpen;
    const topY = cy - 15 * o;
    const botY = cy + 11 * Math.min(o, 1.1);
    const almond = `M${cx - 23},${cy} Q${cx},${topY} ${cx + 23},${cy} Q${cx},${botY} ${cx - 23},${cy} Z`;
    const cid = id(`eyeclip${side}`);
    const irisR = 11.5 * (isHero ? 1 : 0.95);
    return (
      <g key={`eye${side}`}>
        <clipPath id={cid}><path d={almond} /></clipPath>
        <path d={almond} fill={`url(#${id("sclera")})`} />
        <g clipPath={`url(#${cid})`}>
          <circle cx={cx + lookX} cy={cy + lookY} r={irisR} fill={`url(#${id("iris")})`} />
          <circle cx={cx + lookX} cy={cy + lookY} r={irisR} fill="none" stroke={rgba("#000", 0.55)} strokeWidth={1.8} />
          <circle cx={cx + lookX} cy={cy + lookY} r={5.2 * emo.pupil} fill="#05070a" />
          <circle cx={cx + lookX - 3.6} cy={cy + lookY - 3.8} r={2.6} fill="#fff" opacity={0.95} />
          <circle cx={cx + lookX + 3.2} cy={cy + lookY + 3.4} r={1.2} fill="#fff" opacity={0.6} />
          {/* upper-lid shadow */}
          <path d={`M${cx - 24},${cy - 1} Q${cx},${topY - 2} ${cx + 24},${cy - 1} L${cx + 24},${topY + 6} Q${cx},${topY + 8} ${cx - 24},${topY + 6} Z`} fill={rgba("#000", 0.28)} />
        </g>
        {/* upper eyelid line + lashes */}
        <path d={`M${cx - 24},${cy + 0.5} Q${cx},${topY - 1.5} ${cx + 24},${cy + 0.5}`} stroke="#0b0b0e" strokeWidth={3.6} fill="none" strokeLinecap="round" />
        <path d={`M${cx + side * 22},${cy - 1} l${side * 7},-4`} stroke="#0b0b0e" strokeWidth={2.4} strokeLinecap="round" />
        {/* lower lid + eye-bag */}
        <path d={`M${cx - 20},${cy + 2} Q${cx},${botY + 1} ${cx + 20},${cy + 2}`} stroke={rgba("#3a1d12", 0.45)} strokeWidth={1.6} fill="none" />
        <path d={`M${cx - 18},${botY + 7} Q${cx},${botY + 13} ${cx + 18},${botY + 7}`} stroke={rgba("#3a1d12", 0.22)} strokeWidth={4} fill="none" strokeLinecap="round" />
        {/* eyelid crease */}
        <path d={`M${cx - 20},${topY - 5} Q${cx},${topY - 11} ${cx + 20},${topY - 5}`} stroke={rgba("#3a1d12", 0.3)} strokeWidth={1.8} fill="none" />
      </g>
    );
  };

  const mouth = () => {
    const my = 72;
    const mw = 27;
    const c = emo.mouthCurve;
    const h = open * 34;
    const upper = `M${-mw},${my + c * 0.35} Q${-12},${my - 8 + c * 0.2} 0,${my - 4} Q12,${my - 8 + c * 0.2} ${mw},${my + c * 0.35} Q0,${my + 1.5} ${-mw},${my + c * 0.35} Z`;
    const lower = `M${-mw + 2},${my + c * 0.35 + 1 + h * 0.2} Q0,${my + 14 + h} ${mw - 2},${my + c * 0.35 + 1 + h * 0.2} Q0,${my + 2 + h * 0.8} ${-mw + 2},${my + c * 0.35 + 1 + h * 0.2} Z`;
    const cavity = `M${-mw + 3},${my + c * 0.3 + 0.5} Q0,${my + 1.5 + h * 1.35} ${mw - 3},${my + c * 0.3 + 0.5} Q0,${my - 2} ${-mw + 3},${my + c * 0.3 + 0.5} Z`;
    return (
      <g>
        {open > 0.06 && (
          <g>
            <path d={cavity} fill="#2a0a0e" />
            <clipPath id={id("mclip")}><path d={cavity} /></clipPath>
            <g clipPath={`url(#${id("mclip")})`}>
              <rect x={-mw + 5} y={my - 2} width={(mw - 5) * 2} height={7} fill="#f2efe8" rx={2} />
              <ellipse cx={0} cy={my + h * 1.05 + 2} rx={13} ry={7 + h * 0.18} fill="#b84a52" />
            </g>
          </g>
        )}
        <path d={lower} fill={isHero ? "#b9736b" : "#c26a62"} />
        <path d={upper} fill={isHero ? "#9d5a55" : "#a8514f"} />
        <path d={`M${-mw},${my + c * 0.35} Q0,${my + 1.5 + h * 0.15} ${mw},${my + c * 0.35}`} stroke={rgba("#2a0a0e", 0.7)} strokeWidth={1.8} fill="none" />
        <path d={`M${-mw},${my + c * 0.35} l-3,${-c * 0.2 - 1}`} stroke={rgba("#2a0a0e", 0.5)} strokeWidth={2} strokeLinecap="round" />
        {/* chin dimple shadow */}
        <path d={`M-14,${my + 28 + h * 0.5} Q0,${my + 33 + h * 0.5} 14,${my + 28 + h * 0.5}`} stroke={rgba("#000", 0.14)} strokeWidth={4} fill="none" strokeLinecap="round" />
      </g>
    );
  };

  const hand = (w: { x: number }, wy: number, a2: number, p: HandPose, side: -1 | 1) => {
    const fingers: React.ReactNode[] = [];
    const defs: { x: number; len: number; w: number }[] = [
      { x: -15, len: 26, w: 9 }, { x: -5, len: 31, w: 9.5 }, { x: 5, len: 30, w: 9.5 }, { x: 15, len: 24, w: 8.5 },
    ];
    defs.forEach((f, i) => {
      let len = f.len, rot = 0;
      if (p === "fist") len = 11;
      if (p === "grip") { len = 13; rot = side * -6; }
      if (p === "open") rot = (i - 1.5) * 11;
      if (p === "point") len = i === 1 ? 46 : 10;
      if (p === "relaxed") { len = f.len * 0.85; rot = (i - 1.5) * 3; }
      fingers.push(
        <g key={i} transform={`translate(${f.x},46) rotate(${rot})`}>
          <rect x={-f.w / 2} y={0} width={f.w} height={len} rx={f.w / 2} fill={skin} stroke={rgba("#000", 0.35)} strokeWidth={1.3} />
          <path d={`M${-f.w / 2 + 1},${len * 0.5} h${f.w - 2}`} stroke={rgba("#000", 0.22)} strokeWidth={1} />
          <circle cx={0} cy={len - 4} r={1.2} fill={rgba("#fff", 0.35)} />
        </g>
      );
    });
    return (
      <g transform={`translate(${w.x},${wy}) rotate(${-a2})`}>
        <rect x={-23} y={2} width={46} height={50} rx={16} fill={`url(#${id("skinG")})`} stroke={rgba("#000", 0.4)} strokeWidth={1.5} />
        {/* knuckles */}
        {[-15, -5, 5, 15].map((kx, i) => <circle key={i} cx={kx} cy={46} r={2.2} fill={rgba("#000", 0.18)} />)}
        {fingers}
        {/* thumb */}
        <g transform={`translate(${-side * 22},22) rotate(${side * (p === "point" || p === "open" ? 38 : 14)})`}>
          <rect x={-6} y={0} width={12} height={p === "open" ? 28 : 22} rx={6} fill={skin} stroke={rgba("#000", 0.35)} strokeWidth={1.3} />
        </g>
        {/* wrist crease */}
        <path d="M-18,8 Q0,13 18,8" stroke={rgba("#000", 0.2)} strokeWidth={1.4} fill="none" />
      </g>
    );
  };

  const arm = (s: { x: number; y: number }, j: { e: { x: number; y: number }; w: { x: number; y: number } }, a2: number, p: HandPose, side: -1 | 1, tag: string) => {
    const sleeve = look.top;
    const dark = look.topDark;
    const polyU = `M${s.x},${s.y} L${j.e.x},${j.e.y}`;
    const polyF = `M${j.e.x},${j.e.y} L${j.w.x},${j.w.y}`;
    // cuff direction
    return (
      <g key={tag}>
        <path d={polyU} stroke={dark} strokeWidth={66} strokeLinecap="round" />
        <path d={polyU} stroke={sleeve} strokeWidth={60} strokeLinecap="round" />
        <path d={polyU} stroke={rgba("#000", 0.26)} strokeWidth={22} strokeLinecap="round" transform="translate(11,5)" />
        <path d={polyU} stroke={rgba("#fff", 0.1)} strokeWidth={12} strokeLinecap="round" transform="translate(-12,-4)" />
        <path d={polyF} stroke={dark} strokeWidth={56} strokeLinecap="round" />
        <path d={polyF} stroke={sleeve} strokeWidth={50} strokeLinecap="round" />
        <path d={polyF} stroke={rgba("#000", 0.24)} strokeWidth={18} strokeLinecap="round" transform="translate(10,5)" />
        <path d={polyF} stroke={rgba("#fff", 0.09)} strokeWidth={10} strokeLinecap="round" transform="translate(-10,-4)" />
        {/* elbow creases */}
        <path d={`M${j.e.x - 26},${j.e.y - 6} q26,12 52,0`} stroke={rgba("#000", 0.35)} strokeWidth={2.2} fill="none" />
        <path d={`M${j.e.x - 22},${j.e.y + 6} q22,10 44,0`} stroke={rgba("#000", 0.22)} strokeWidth={2} fill="none" />
        {!isHero && <ellipse cx={j.e.x} cy={j.e.y} rx={17} ry={22} fill="#7a5a3c" opacity={0.85} transform={`rotate(${-a2 / 2} ${j.e.x} ${j.e.y})`} />}
        {/* cuff */}
        <circle cx={j.w.x} cy={j.w.y} r={27} fill={dark} />
        <circle cx={j.w.x} cy={j.w.y} r={24} fill={sleeve} />
        {isHero ? null : <circle cx={j.w.x} cy={j.w.y} r={19} fill="none" stroke="#edf2f7" strokeWidth={5} />}
        {hand(j.w, j.w.y - 4, a2, p, side)}
      </g>
    );
  };

  /* ---------- props held ---------- */
  const heldProps = () => {
    const out: React.ReactNode[] = [];
    const has = (k: string) => props.includes(k);
    if (has("smartphone") && pose.R.hand === "grip") {
      const cx = (L.w.x + R.w.x) / 2;
      const cy = (L.w.y + R.w.y) / 2 + 6;
      out.push(
        <g key="phone" transform={`translate(${cx},${cy}) rotate(-4)`}>
          <ellipse cx={0} cy={-40} rx={90} ry={44} fill={pg} opacity={0.22} />
          <rect x={-46} y={-70} width={92} height={150} rx={14} fill="#0a0c10" stroke="#2b3139" strokeWidth={3} />
          <rect x={-40} y={-62} width={80} height={134} rx={9} fill={`url(#${id("phoneScr")})`} />
          {/* cracked glass */}
          <path d="M-12,-62 L-2,-20 L-20,6 L-8,40 L6,72 M-2,-20 L22,-2 L34,30 M-20,6 L-40,14" stroke="#fff" strokeOpacity={0.55} strokeWidth={1.2} fill="none" />
          <rect x={-30} y={-52} width={60} height={9} rx={3} fill={pg} opacity={0.85} />
          <rect x={-30} y={-36} width={60} height={4} rx={2} fill="#fff" opacity={0.7} />
          <rect x={-30} y={-28} width={44} height={4} rx={2} fill="#fff" opacity={0.45} />
          <rect x={-30} y={-14} width={60} height={40} rx={4} fill="#0b0b0e" stroke={pg} strokeWidth={1.2} />
          <path d={`M-26,${6 + Math.sin(t * 6) * 4} l8,-10 l8,16 l8,-22 l8,18 l8,-8 l8,6`} stroke={pg2} strokeWidth={1.6} fill="none" />
          <rect x={-14} y={-67} width={28} height={4} rx={2} fill="#000" />
        </g>
      );
    }
    if (has("keys")) {
      const w = pose.R.hand === "fist" || pose.R.hand === "relaxed" ? R.w : L.w;
      const sw = Math.sin(t * 7) * 6;
      out.push(
        <g key="keys" transform={`translate(${w.x},${w.y + 44}) rotate(${sw})`}>
          <circle cx={0} cy={0} r={13} fill="none" stroke="#c9ced6" strokeWidth={4} />
          {[-24, 0, 24].map((k, i) => (
            <g key={i} transform={`rotate(${k}) translate(0,12)`}>
              <rect x={-4} y={0} width={8} height={30} rx={3} fill={i === 1 ? "#d4af37" : "#aeb4bd"} stroke="#555" strokeWidth={1} />
              <rect x={-4} y={22} width={8} height={4} fill="#666" />
            </g>
          ))}
        </g>
      );
    }
    if (has("class_roster")) {
      const w = pose.L.hand === "relaxed" ? L.w : R.w;
      out.push(
        <g key="roster" transform={`translate(${w.x},${w.y + 26}) rotate(8)`}>
          <rect x={-40} y={-8} width={80} height={104} rx={4} fill="#c8a875" stroke="#6b5434" strokeWidth={2} />
          <rect x={-35} y={-2} width={70} height={92} fill="#f4f1e8" />
          <rect x={-14} y={-12} width={28} height={10} rx={3} fill="#8a8f98" />
          {Array.from({ length: 9 }).map((_, i) => <rect key={i} x={-28} y={8 + i * 9} width={i % 3 === 0 ? 52 : 38} height={2.5} fill="#3a3f4a" opacity={0.7} />)}
        </g>
      );
    }
    return out;
  };

  /* ---------- hair ---------- */
  const backHair = isHero ? (
    <g key="bh">
      <path d="M-96,-30 C-110,-120 -60,-150 0,-152 C60,-150 110,-120 96,-30 C100,10 86,30 78,10 C70,-40 -70,-40 -78,10 C-86,30 -100,10 -96,-30 Z" fill={hairC} />
    </g>
  ) : (
    <g key="bh">
      <circle cx={0} cy={-148} r={44} fill={hairC} />
      <circle cx={0} cy={-148} r={44} fill={`url(#${id("hairG")})`} />
      <path d="M-18,-168 q18,-14 36,0 M-24,-152 q24,-16 48,0 M-20,-136 q20,-10 40,0" stroke={rgba("#000", 0.45)} strokeWidth={2} fill="none" />
      <path d="M-98,-20 C-110,-110 -56,-140 0,-140 C56,-140 110,-110 98,-20 C96,40 84,52 74,30 L-74,30 C-84,52 -96,40 -98,-20 Z" fill={hairC} />
    </g>
  );

  const frontHair = isHero ? (
    <g key="fh">
      <path d="M-94,-34 C-100,-118 -48,-150 6,-148 C66,-146 104,-110 94,-34 C88,-62 70,-82 46,-88 L40,-70 L28,-96 L14,-72 L0,-100 L-14,-70 L-30,-92 L-38,-66 L-58,-80 C-76,-70 -86,-52 -94,-34 Z" fill={hairC} />
      <path d="M-70,-88 l-14,-24 M-40,-104 l-8,-28 M-8,-108 l-2,-30 M26,-104 l10,-26 M58,-92 l18,-22 M80,-70 l22,-12 M-86,-60 l-22,-6" stroke={hairC} strokeWidth={9} strokeLinecap="round" />
      <path d="M-60,-104 q30,-26 70,-18 M-30,-92 q20,-18 56,-14 M-84,-70 q10,-30 40,-46" stroke={rgba("#7a8aa0", 0.4)} strokeWidth={2.2} fill="none" />
      <path d="M-48,-84 q-8,10 -4,22 M-12,-82 q-6,12 0,22 M30,-80 q8,12 4,24" stroke={hairC} strokeWidth={8} strokeLinecap="round" />
    </g>
  ) : (
    <g key="fh">
      <path d="M-96,-30 C-102,-120 -46,-146 4,-144 C62,-142 104,-112 96,-30 C90,-76 56,-98 4,-100 C-46,-98 -88,-76 -96,-30 Z" fill={hairC} />
      <path d="M-70,-96 q40,-26 92,-10 M-86,-70 q30,-40 100,-30 M0,-134 q40,6 76,34" stroke={rgba("#c89a7a", 0.35)} strokeWidth={2.2} fill="none" />
      {/* flyaway strands (panic) */}
      <path d="M-74,-74 q-18,24 -10,56 M70,-78 q20,22 14,60 M-4,-100 q-14,-20 -30,-22" stroke={hairC} strokeWidth={3} fill="none" strokeLinecap="round" />
    </g>
  );

  const glasses = !isHero ? (
    <g key="gl" transform="rotate(5 0 -8)">
      <ellipse cx={-38} cy={-8} rx={30} ry={22} fill={rgba("#bfe6ff", 0.12)} stroke="#2a2420" strokeWidth={4} />
      <ellipse cx={38} cy={-4} rx={30} ry={22} fill={rgba("#bfe6ff", 0.12)} stroke="#2a2420" strokeWidth={4} />
      <path d="M-8,-12 q8,-8 16,-2" stroke="#2a2420" strokeWidth={4} fill="none" />
      <path d="M-68,-12 L-96,-18 M68,-8 L96,-14" stroke="#2a2420" strokeWidth={4} />
      <path d="M-56,-18 l16,-8 M20,-14 l16,-8" stroke="#fff" strokeOpacity={0.5} strokeWidth={2.5} strokeLinecap="round" />
    </g>
  ) : null;

  /* ---------- clothing ---------- */
  const torso = (
    <g key="torso" transform={`translate(0,${pose.bob * 0.4}) translate(300,880) scale(1,${breath}) translate(-300,-880)`}>
      {/* hero backpack top peeking over shoulders */}
      {isHero && <path d="M120,430 Q130,380 190,372 L410,372 Q470,380 480,430 L470,520 L130,520 Z" fill="#161b22" />}
      <path d="M150,470 Q150,420 212,404 L262,388 L338,388 L388,404 Q450,420 450,470 L478,890 L122,890 Z" fill={`url(#${id("torsoG")})`} stroke={look.topDark} strokeWidth={3} />
      {!isHero && <path d="M150,470 Q150,420 212,404 L262,388 L338,388 L388,404 Q450,420 450,470 L478,890 L122,890 Z" fill={`url(#${id("tweed")})`} opacity={0.55} />}
      {/* body shading: side planes + centre fold */}
      <path d="M150,470 Q150,420 212,404 L190,890 L122,890 Z" fill={rgba("#000", 0.2)} />
      <path d="M450,470 Q450,420 388,404 L410,890 L478,890 Z" fill={rgba("#000", 0.3)} />
      {/* fabric creases */}
      <path d="M200,560 q22,30 8,70 M170,660 q30,16 24,70 M400,570 q-24,28 -10,66 M430,680 q-30,14 -22,66 M300,640 q-6,50 2,100" stroke={rgba("#000", 0.3)} strokeWidth={2.4} fill="none" />
      <path d="M236,520 q16,10 30,40 M364,520 q-16,10 -30,40" stroke={rgba("#fff", 0.1)} strokeWidth={2} fill="none" />
      {isHero ? (
        <g>
          {/* hood bunched behind neck */}
          <path d="M214,404 Q300,370 386,404 Q372,432 300,436 Q228,432 214,404 Z" fill={look.topDark} />
          <path d="M226,408 Q300,384 374,408" stroke={rgba("#fff", 0.1)} strokeWidth={3} fill="none" />
          {/* undershirt neckline */}
          <path d="M262,392 L300,452 L338,392 Z" fill="#cfd6df" />
          {/* drawstrings + aglets */}
          <path d="M276,440 q-6,50 -4,92 M324,440 q6,50 4,92" stroke="#e2e8f0" strokeWidth={4} fill="none" strokeLinecap="round" />
          <rect x={268} y={528} width={8} height={14} rx={3} fill="#aab2bd" />
          <rect x={324} y={532} width={8} height={14} rx={3} fill="#aab2bd" />
          {/* kangaroo pocket */}
          <path d="M190,760 L410,760 L440,880 L160,880 Z" fill={rgba("#000", 0.16)} stroke={rgba("#000", 0.45)} strokeWidth={2.4} />
          <path d="M214,764 L262,880 M386,764 L338,880" stroke={rgba("#000", 0.4)} strokeWidth={2.2} />
          {/* backpack straps */}
          <path d="M232,410 Q224,500 234,610" stroke="#0f1318" strokeWidth={34} fill="none" strokeLinecap="round" />
          <path d="M368,410 Q376,500 366,610" stroke="#0f1318" strokeWidth={34} fill="none" strokeLinecap="round" />
          <path d="M232,420 Q226,500 235,600 M368,420 Q374,500 365,600" stroke="#3b4350" strokeWidth={2} strokeDasharray="6 6" fill="none" />
          <path d="M232,520 L368,520" stroke="#0f1318" strokeWidth={10} />
          <rect x={288} y={510} width={24} height={20} rx={4} fill="#2a313b" stroke="#566" strokeWidth={1.5} />
          {/* silver pendant */}
          <path d="M268,414 Q290,480 300,498 Q310,480 332,414" stroke="#cfd6df" strokeWidth={2.2} fill="none" />
          <g transform="translate(300,508)">
            <circle r={13} fill="#d9dee6" stroke="#8a93a0" strokeWidth={2} />
            <circle r={13} fill={rgba(keyColor, 0.35)} />
            <path d="M0,-8 L5,0 L0,8 L-5,0 Z" fill="#fff" opacity={0.9} />
          </g>
        </g>
      ) : (
        <g>
          {/* white blouse V + lanyard */}
          <path d="M262,392 L300,520 L338,392 Z" fill="#edf2f7" />
          <path d="M262,392 L300,520 L338,392" stroke={rgba("#000", 0.25)} strokeWidth={2} fill="none" />
          <path d="M280,420 q20,18 40,0" stroke={rgba("#000", 0.12)} strokeWidth={3} fill="none" />
          {/* notched lapels */}
          <path d="M262,388 L214,404 L238,470 L212,498 L262,520 L300,520 L262,440 Z" fill={look.topDark} stroke={rgba("#000", 0.45)} strokeWidth={2} />
          <path d="M338,388 L386,404 L362,470 L388,498 L338,520 L300,520 L338,440 Z" fill={look.topDark} stroke={rgba("#000", 0.45)} strokeWidth={2} />
          <path d="M240,424 L262,400 M360,424 L338,400" stroke={rgba("#fff", 0.12)} strokeWidth={2.2} />
          {/* buttons + pocket */}
          {[560, 640].map((by) => <g key={by}><circle cx={300} cy={by} r={9} fill="#2a1f1a" /><circle cx={297} cy={by - 3} r={2.4} fill="#fff" opacity={0.4} /></g>)}
          <path d="M330,630 L410,630 L410,690 L330,690 Z" fill="none" stroke={rgba("#000", 0.4)} strokeWidth={2.4} />
          <path d="M250,540 h-34 M250,552 h-30" stroke={rgba("#000", 0.2)} strokeWidth={2} />
          {/* lanyard + ID card */}
          <path d="M270,392 L290,560 M330,392 L310,560" stroke="#1c4f8a" strokeWidth={9} fill="none" />
          <path d="M270,392 L290,560 M330,392 L310,560" stroke="#fff" strokeOpacity={0.2} strokeWidth={2} fill="none" />
          <g transform="translate(300,590) rotate(-3)">
            <rect x={-30} y={-34} width={60} height={78} rx={5} fill="#f6f7f9" stroke="#8a8f98" strokeWidth={2} />
            <rect x={-22} y={-26} width={32} height={34} rx={3} fill="#9aa5b4" />
            <circle cx={-6} cy={-14} r={7} fill="#d9a78b" />
            <rect x={-22} y={14} width={44} height={5} fill="#3a3f4a" />
            <rect x={-22} y={24} width={28} height={4} fill="#8a8f98" />
            <rect x={-5} y={-40} width={10} height={9} rx={2} fill="#8a8f98" />
          </g>
        </g>
      )}
    </g>
  );

  const neck = (
    <g key="neck">
      <path d="M254,330 L346,330 L352,400 Q300,430 248,400 Z" fill={`url(#${id("skinG")})`} />
      <path d="M254,330 L346,330 L348,372 Q300,392 252,372 Z" fill={rgba("#000", 0.34)} />
      <path d="M262,392 Q300,414 338,392" stroke={rgba("#000", 0.3)} strokeWidth={3} fill="none" />
      <path d="M278,370 l-2,28 M322,370 l2,28" stroke={rgba("#000", 0.14)} strokeWidth={3} strokeLinecap="round" />
    </g>
  );

  /* ---------- head ---------- */
  const jw = look.jawW;
  const cheek = look.cheek;
  const facePath = `M${-cheek - 2},-20 C${-cheek - 4},-90 -52,-128 0,-128 C52,-128 ${cheek + 4},-90 ${cheek + 2},-20 C${cheek + 2},30 ${jw + 26},72 ${jw},100 C${jw - 14},114 18,122 0,122 C-18,122 ${-jw + 14},114 ${-jw},100 C${-jw - 26},72 ${-cheek - 2},30 ${-cheek - 2},-20 Z`;

  const head = (
    <g key="head" transform={`translate(${300 + jx},${268 + pose.dip + pose.bob + jy}) rotate(${pose.tilt})`}>
      {backHair}
      {/* ears */}
      {[-1, 1].map((sd) => (
        <g key={`ear${sd}`}>
          <ellipse cx={sd * (cheek + 2)} cy={4} rx={13} ry={26} fill={skin} stroke={rgba("#000", 0.35)} strokeWidth={1.6} />
          <path d={`M${sd * (cheek + 2)},-12 q${sd * 7},14 0,30`} stroke={look.skinShade} strokeWidth={3} fill="none" />
        </g>
      ))}
      <path d={facePath} fill={`url(#${id("faceG")})`} stroke={rgba("#000", 0.45)} strokeWidth={2.6} />
      {/* cel shadow plane (light from upper-left) */}
      <clipPath id={id("faceclip")}><path d={facePath} /></clipPath>
      <g clipPath={`url(#${id("faceclip")})`}>
        <path d={`M${cheek + 6},-120 L${cheek + 6},140 L${cheek - 40},140 C${cheek - 18},60 ${cheek - 20},0 ${cheek - 34},-100 Z`} fill={rgba("#000", 0.26)} />
        <ellipse cx={0} cy={108} rx={54} ry={20} fill={rgba("#000", 0.12)} />
        {/* forehead shadow under hair */}
        <rect x={-110} y={-88} width={220} height={26} fill={rgba("#000", 0.22)} />
        {/* cheekbones */}
        <path d={`M${-cheek + 14},12 Q${-cheek + 34},34 ${-48},44`} stroke={rgba("#000", 0.07)} strokeWidth={7} fill="none" strokeLinecap="round" />
        <path d={`M${cheek - 14},12 Q${cheek - 34},34 48,44`} stroke={rgba("#000", 0.11)} strokeWidth={7} fill="none" strokeLinecap="round" />
        {/* dark circles / fatigue */}
        <ellipse cx={-38} cy={10} rx={26} ry={8} fill={rgba("#3a2050", 0.14)} />
        <ellipse cx={38} cy={10} rx={26} ry={8} fill={rgba("#3a2050", 0.14)} />
        {/* fear sweat sheen */}
        {emo.tremble > 1 && <ellipse cx={-70} cy={-60} rx={3} ry={6} fill="#fff" opacity={0.55} />}
      </g>
      {/* nose */}
      <path d="M-4,-18 Q-12,16 -9,38" stroke={rgba("#000", 0.3)} strokeWidth={7} fill="none" strokeLinecap="round" />
      <path d="M5,-18 Q8,10 6,34" stroke={rgba("#fff", 0.16)} strokeWidth={4} fill="none" strokeLinecap="round" />
      <path d="M-16,42 Q0,56 16,42" stroke={rgba("#000", 0.55)} strokeWidth={3} fill="none" strokeLinecap="round" />
      <ellipse cx={-8} cy={44} rx={3.4} ry={2.4} fill={rgba("#2a0a0e", 0.7)} />
      <ellipse cx={8} cy={44} rx={3.4} ry={2.4} fill={rgba("#2a0a0e", 0.7)} />
      <ellipse cx={0} cy={54} rx={15} ry={5} fill={rgba("#000", 0.14)} />
      {eye(-1)}
      {eye(1)}
      {brow(-1)}
      {brow(1)}
      {mouth()}
      {isHero && (
        <g>
          {/* scar above lip */}
          <path d="M8,56 l9,-9" stroke="#9c5c5c" strokeWidth={3.2} strokeLinecap="round" />
          <path d="M10,54 l4,-1 M13,50 l4,-1" stroke="#f1d6d0" strokeWidth={1.4} />
          {/* stubble shadow */}
          <path d="M-40,84 Q0,112 40,84" stroke={rgba("#1b1410", 0.12)} strokeWidth={10} fill="none" />
        </g>
      )}
      {frontHair}
      {glasses}
    </g>
  );

  const rimFilter = (
    <filter id={id("rim")} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
      <feOffset in="SourceAlpha" dx={rimDx} dy={1.5} result="o" />
      <feComposite in="SourceAlpha" in2="o" operator="out" result="edge" />
      <feFlood floodColor={`rgb(${kr},${kg},${kb})`} floodOpacity={0.95} result="fl" />
      <feComposite in="fl" in2="edge" operator="in" result="rimc" />
      <feGaussianBlur in="rimc" stdDeviation={0.6} result="rimb" />
      <feDropShadow in="SourceGraphic" dx={flip ? -16 : 16} dy={10} stdDeviation={11} floodColor="#000" floodOpacity={0.5} result="ds" />
      <feMerge>
        <feMergeNode in="ds" />
        <feMergeNode in="SourceGraphic" />
        <feMergeNode in="rimb" />
        <feMergeNode in="rimb" />
      </feMerge>
    </filter>
  );

  return (
    <svg
      width={RIG_W * scale}
      height={RIG_H * scale}
      viewBox={`0 0 ${RIG_W} ${RIG_H}`}
      style={{ overflow: "visible" }}
    >
      <defs>
        {rimFilter}
        <linearGradient id={id("skinG")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={shade(skin, 0.12)} />
          <stop offset="0.55" stopColor={skin} />
          <stop offset="1" stopColor={look.skinShade} />
        </linearGradient>
        <radialGradient id={id("faceG")} cx="0.38" cy="0.32" r="0.85">
          <stop offset="0" stopColor={shade(skin, 0.16)} />
          <stop offset="0.5" stopColor={skin} />
          <stop offset="1" stopColor={look.skinShade} />
        </radialGradient>
        <radialGradient id={id("sclera")} cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#cfd6df" />
        </radialGradient>
        <radialGradient id={id("iris")} cx="0.5" cy="0.35" r="0.75">
          <stop offset="0" stopColor={shade(look.iris, 0.35)} />
          <stop offset="0.6" stopColor={look.iris} />
          <stop offset="1" stopColor={shade(look.iris, -0.55)} />
        </radialGradient>
        <linearGradient id={id("torsoG")} x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0" stopColor={shade(look.top, 0.16)} />
          <stop offset="0.5" stopColor={look.top} />
          <stop offset="1" stopColor={look.topDark} />
        </linearGradient>
        <radialGradient id={id("hairG")} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor={rgba("#ffffff", 0.18)} />
          <stop offset="1" stopColor={rgba("#000000", 0.35)} />
        </radialGradient>
        <linearGradient id={id("phoneScr")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={shade(pg, -0.7)} />
          <stop offset="1" stopColor="#05070a" />
        </linearGradient>
        <pattern id={id("tweed")} width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill="none" />
          <path d="M0,0 h7 v7 h-7 z M7,7 h7 v7 h-7 z" fill="#2a2018" opacity="0.55" />
          <path d="M0,7 l7,7 M7,0 l7,7" stroke="#b8a48c" strokeWidth="0.9" opacity="0.55" />
        </pattern>
      </defs>
      <g transform={flip ? `translate(${RIG_W},0) scale(-1,1)` : undefined}>
      <g filter={`url(#${id("rim")})`}>
        {torso}
        {neck}
        {head}
        {arm(SH_L, L, pose.L.a2, pose.L.hand, -1, "armL")}
        {arm(SH_R, R, pose.R.a2, pose.R.hand, 1, "armR")}
        {heldProps()}
      </g>
      </g>
    </svg>
  );
};
