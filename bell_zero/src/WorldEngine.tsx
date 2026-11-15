import React from "react";
import { FONT_MONO, H, W, getLighting } from "./tokens";
import { Monitor } from "./types";
import { rgba, rng } from "./util";

/**
 * Micro-detailed environments, 4 z-layers per location:
 *   far (blurred 2px, parallax 0.5) -> mid architecture (parallax 1.0)
 *   -> interactive/live props z:0 -> foreground framing (blurred 5px, parallax 1.7)
 * Every monitor renders live SVG micro-graphics (never blank / solid).
 */

const STATUS_COLOR = { ok: "#4ade80", warning: "#ffd23f", danger: "#ff2d3a" } as const;

/* ------------------------------------------------------------------ monitors */

interface ScreenProps { w: number; h: number; t: number; status: Monitor["status"]; sealed?: boolean }

const Scan: React.FC<{ w: number; h: number; t: number }> = ({ w, h, t }) => (
  <g pointerEvents="none">
    {Array.from({ length: Math.floor(h / 4) }).map((_, i) => <rect key={i} x={0} y={i * 4} width={w} height={1.2} fill="#000" opacity={0.22} />)}
    <rect x={0} y={((t * 90) % (h + 40)) - 40} width={w} height={36} fill="#fff" opacity={0.05} />
  </g>
);

const Waveform: React.FC<{ x: number; y: number; w: number; h: number; t: number; color: string; seed?: number; amp?: number }> = ({ x, y, w, h, t, color, seed = 1, amp = 1 }) => {
  const pts: string[] = [];
  const n = 60;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const ph = u * 14 + t * 5 + seed;
    const v = (Math.sin(ph) * 0.5 + Math.sin(ph * 2.3 + seed) * 0.3 + Math.sin(ph * 5.1) * 0.15) * amp;
    pts.push(`${i === 0 ? "M" : "L"}${(x + u * w).toFixed(1)},${(y + h / 2 + v * (h / 2.4)).toFixed(1)}`);
  }
  return <path d={pts.join(" ")} stroke={color} strokeWidth={2.2} fill="none" />;
};

const EmergencyBroadcast: React.FC<ScreenProps> = ({ w, h, t, status }) => {
  const c = STATUS_COLOR[status];
  const flash = 0.65 + 0.35 * Math.sin(t * 7);
  const sweep = (t * 120) % 360;
  const rx = w * 0.24, ry = h * 0.56, rr = Math.min(w, h) * 0.26;
  const ticker = "SHELTER IN PLACE  •  DO NOT LEAVE THE BUILDING  •  CODE 77 BIO-THREAT  •  AUTOMATED MILITARY LOOP  •  ";
  const off = (t * 70) % 760;
  return (
    <g>
      <rect width={w} height={h} fill="#12040a" />
      <rect width={w} height={h * 0.2} fill={c} opacity={0.88 * flash} />
      <text x={w / 2} y={h * 0.145} textAnchor="middle" fontFamily={FONT_MONO} fontWeight={800} fontSize={h * 0.082} fill="#fff">EMERGENCY BROADCAST SYSTEM</text>
      {/* radar */}
      <circle cx={rx} cy={ry} r={rr} fill="#07110a" stroke={c} strokeWidth={2} />
      {[0.33, 0.66].map((k) => <circle key={k} cx={rx} cy={ry} r={rr * k} fill="none" stroke={rgba(c, 0.5)} strokeWidth={1} />)}
      <path d={`M${rx - rr},${ry} H${rx + rr} M${rx},${ry - rr} V${ry + rr}`} stroke={rgba(c, 0.4)} strokeWidth={1} />
      <path d={`M${rx},${ry} L${rx + rr * Math.cos((sweep * Math.PI) / 180)},${ry + rr * Math.sin((sweep * Math.PI) / 180)} L${rx + rr * Math.cos(((sweep - 28) * Math.PI) / 180)},${ry + rr * Math.sin(((sweep - 28) * Math.PI) / 180)} Z`} fill={rgba(c, 0.35)} />
      {[[0.5, 0.3], [-0.4, 0.5], [0.2, -0.6], [-0.2, -0.3], [0.6, -0.2]].map(([bx, by], i) => (
        <circle key={i} cx={rx + bx * rr} cy={ry + by * rr} r={3.4} fill={c} opacity={0.4 + 0.6 * Math.abs(Math.sin(t * 3 + i))} />
      ))}
      {/* waveforms */}
      <rect x={w * 0.5} y={h * 0.3} width={w * 0.46} height={h * 0.4} fill="#07110a" stroke={rgba(c, 0.6)} />
      <Waveform x={w * 0.5} y={h * 0.3} w={w * 0.46} h={h * 0.2} t={t} color="#ffffff" seed={1} amp={0.9} />
      <Waveform x={w * 0.5} y={h * 0.5} w={w * 0.46} h={h * 0.2} t={t} color={c} seed={3} amp={status === "danger" ? 1.4 : 0.8} />
      <text x={w * 0.52} y={h * 0.345} fontFamily={FONT_MONO} fontSize={h * 0.05} fill="#fff" opacity={0.85}>SIGNAL 77 / LVL 4</text>
      {/* ticker */}
      <rect x={0} y={h * 0.84} width={w} height={h * 0.16} fill={c} opacity={0.9} />
      <g clipPath="url(#tv-ticker-clip)">
        <text x={-off} y={h * 0.95} fontFamily={FONT_MONO} fontWeight={800} fontSize={h * 0.09} fill="#0a0204">{ticker + ticker}</text>
      </g>
      <clipPath id="tv-ticker-clip"><rect x={0} y={h * 0.84} width={w} height={h * 0.16} /></clipPath>
      <rect width={w} height={h} fill={c} opacity={0.05 + 0.05 * Math.sin(t * 13)} />
      <Scan w={w} h={h} t={t} />
    </g>
  );
};

const PhoneLock: React.FC<ScreenProps> = ({ w, h, t, status }) => {
  const c = STATUS_COLOR[status];
  const pulse = 0.5 + 0.5 * Math.sin(t * 8);
  return (
    <g>
      <rect width={w} height={h} fill="#10040a" />
      <rect width={w} height={h} fill={c} opacity={0.08 + pulse * 0.08} />
      <text x={w / 2} y={h * 0.2} textAnchor="middle" fontFamily={FONT_MONO} fontWeight={800} fontSize={h * 0.13} fill="#fff">14:15</text>
      <text x={w / 2} y={h * 0.27} textAnchor="middle" fontFamily={FONT_MONO} fontSize={h * 0.04} fill="#fff" opacity={0.7}>MONDAY</text>
      <rect x={w * 0.07} y={h * 0.34} width={w * 0.86} height={h * 0.28} rx={12} fill="#2a0a10" stroke={c} strokeWidth={3} opacity={0.6 + pulse * 0.4} />
      <rect x={w * 0.12} y={h * 0.38} width={w * 0.1} height={w * 0.1} rx={6} fill={c} />
      <text x={w * 0.26} y={h * 0.43} fontFamily={FONT_MONO} fontWeight={800} fontSize={h * 0.045} fill="#fff">EMERGENCY ALERT</text>
      <text x={w * 0.26} y={h * 0.49} fontFamily={FONT_MONO} fontSize={h * 0.037} fill="#fff" opacity={0.85}>LEVEL 4 — SEEK SHELTER</text>
      <text x={w * 0.26} y={h * 0.55} fontFamily={FONT_MONO} fontSize={h * 0.033} fill="#fff" opacity={0.6}>Do not go outside.</text>
      <Waveform x={w * 0.1} y={h * 0.66} w={w * 0.8} h={h * 0.12} t={t} color={c} seed={2} />
      <rect x={w * 0.35} y={h * 0.9} width={w * 0.3} height={5} rx={2.5} fill="#fff" opacity={0.7} />
      <Scan w={w} h={h} t={t} />
    </g>
  );
};

const CctvFeed: React.FC<ScreenProps> = ({ w, h, t }) => {
  const cells = [
    { n: "CAM 01 EAST GATE", x: 0, y: 0 }, { n: "CAM 02 YARD", x: 1, y: 0 },
    { n: "CAM 03 STAIRWELL", x: 0, y: 1 }, { n: "CAM 04 GROUND FLR", x: 1, y: 1 },
  ];
  const cw = w / 2, ch = (h - 20) / 2;
  const r = rng(11);
  return (
    <g>
      <rect width={w} height={h} fill="#031208" />
      {cells.map((c, ci) => {
        const ox = c.x * cw, oy = 20 + c.y * ch;
        const crowd = ci === 0 ? 9 : ci === 3 ? 7 : 3;
        return (
          <g key={ci}>
            <rect x={ox + 1} y={oy + 1} width={cw - 2} height={ch - 2} fill="#072814" stroke="#2eff8a" strokeOpacity={0.5} />
            {ci === 0 && Array.from({ length: 9 }).map((_, i) => <rect key={i} x={ox + 8 + i * (cw / 9.4)} y={oy + 10} width={3} height={ch - 20} fill="#2eff8a" opacity={0.25} transform={i > 4 ? `rotate(${(i - 4) * 4} ${ox + 8 + i * (cw / 9.4)} ${oy + ch})` : undefined} />)}
            {Array.from({ length: crowd }).map((_, i) => {
              const sp = 0.25 + r() * 0.5;
              const px = ox + ((r() * cw + t * sp * 40 * (ci === 0 ? 1 : -1) + i * 31) % (cw - 16)) + 6;
              const py = oy + ch * (0.5 + r() * 0.4);
              return (
                <g key={i}>
                  <circle cx={px} cy={py - 14} r={4.5} fill="#b8ffd8" opacity={0.85} />
                  <path d={`M${px - 6},${py + 10} Q${px},${py - 10} ${px + 6},${py + 10} Z`} fill="#b8ffd8" opacity={0.75} />
                </g>
              );
            })}
            <text x={ox + 6} y={oy + 14} fontFamily={FONT_MONO} fontSize={10} fill="#2eff8a">{c.n}</text>
          </g>
        );
      })}
      <circle cx={10} cy={10} r={4.5} fill="#ff2d3a" opacity={0.5 + 0.5 * Math.sin(t * 6)} />
      <text x={20} y={14} fontFamily={FONT_MONO} fontSize={11} fill="#fff">REC  14:{String(52 + Math.floor(t) % 6).padStart(2, "0")}:{String(Math.floor(t * 10) % 60).padStart(2, "0")}</text>
      <text x={w - 8} y={14} textAnchor="end" fontFamily={FONT_MONO} fontSize={11} fill="#ff2d3a">BREACH</text>
      <rect width={w} height={h} fill="#2eff8a" opacity={0.05 + 0.05 * Math.sin(t * 17)} />
      <Scan w={w} h={h} t={t} />
    </g>
  );
};

const LockStatus: React.FC<ScreenProps & { content: string }> = ({ w, h, t, status, content, sealed }) => {
  let c: string = STATUS_COLOR[status];
  let l1 = "AUTO-LOCKDOWN";
  let l2 = "DOOR: UNLATCHED";
  if (content === "manual_override_ready") { l1 = "MANUAL OVERRIDE"; l2 = "READY — PRESS"; c = STATUS_COLOR.warning; }
  if (sealed) { l1 = "DOOR SEALED"; l2 = "DEADBOLT: ENGAGED"; c = STATUS_COLOR.danger; }
  const blink = sealed ? 1 : 0.55 + 0.45 * Math.sin(t * 6);
  return (
    <g>
      <rect width={w} height={h} fill="#05080c" />
      <rect x={6} y={6} width={w - 12} height={h * 0.5} fill="#07110a" stroke={c} strokeWidth={1.5} />
      <text x={w / 2} y={h * 0.2} textAnchor="middle" fontFamily={FONT_MONO} fontWeight={800} fontSize={w * 0.1} fill={c} opacity={blink}>{l1}</text>
      <text x={w / 2} y={h * 0.34} textAnchor="middle" fontFamily={FONT_MONO} fontSize={w * 0.08} fill="#fff" opacity={0.8}>{l2}</text>
      <circle cx={w / 2} cy={h * 0.72} r={w * 0.2} fill={c} opacity={0.18 * blink} />
      <circle cx={w / 2} cy={h * 0.72} r={w * 0.13} fill={c} opacity={blink} stroke="#000" strokeWidth={3} />
      <Waveform x={8} y={h * 0.54} w={w - 16} h={h * 0.12} t={t} color={c} seed={5} amp={0.6} />
      <Scan w={w} h={h} t={t} />
    </g>
  );
};

export const MonitorScreen: React.FC<{ m: Monitor | undefined; fallback: string; w: number; h: number; t: number; sealed?: boolean }> = ({ m, fallback, w, h, t, sealed }) => {
  const content = m?.content ?? fallback;
  const status = m?.status ?? "warning";
  const p = { w, h, t, status, sealed };
  switch (content) {
    case "phone_lock_screen_alert": return <PhoneLock {...p} />;
    case "school_cctv_feed": return <CctvFeed {...p} />;
    case "lockdown_engaged":
    case "manual_override_ready": return <LockStatus {...p} content={content} />;
    default: return <EmergencyBroadcast {...p} />;
  }
};

/* --------------------------------------------------------------- common bits */

const ConcreteFilter: React.FC = () => (
  <>
    <filter id="concrete" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={3} seed={7} result="n" />
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.9 0.9 0.9 0 -0.9" />
    </filter>
    <filter id="rust" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="turbulence" baseFrequency="0.012 0.05" numOctaves={4} seed={3} result="n" />
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.22  0 0 0 0 0.08  0 0 1.4 0 -0.55" />
    </filter>
    <filter id="blur2"><feGaussianBlur stdDeviation="2" /></filter>
    <filter id="blur3"><feGaussianBlur stdDeviation="3" /></filter>
    <filter id="blur5"><feGaussianBlur stdDeviation="5" /></filter>
    <filter id="blurSoft"><feGaussianBlur stdDeviation="14" /></filter>
  </>
);

const Pipes: React.FC<{ y: number; c: string }> = ({ y, c }) => (
  <g>
    {[0, 1, 2].map((i) => (
      <g key={i}>
        <rect x={0} y={y + i * 26} width={W} height={14} fill="#1a1e26" />
        <rect x={0} y={y + i * 26} width={W} height={4} fill={rgba(c, 0.35)} />
        {Array.from({ length: 6 }).map((_, k) => <rect key={k} x={90 + k * 190 + i * 40} y={y + i * 26 - 4} width={12} height={22} fill="#0d1015" />)}
      </g>
    ))}
    <path d={`M120,${y + 70} q40,90 80,0 M720,${y + 70} q50,110 100,0`} stroke="#0b0d11" strokeWidth={6} fill="none" />
  </g>
);

const Fog: React.FC = () => null;

export interface WorldProps {
  bg: string;
  t: number;          // local scene seconds
  gt: number;         // global episode seconds
  lighting: string;
  monitors: Monitor[];
  dof: string;
  par: number;        // parallax shift in px (positive = camera pans right)
  heroChoiceT: number;
  sceneId: string;
  layer: "back" | "front";
}

const dofBlur = (d: string) => (d === "shallow" ? 3 : d === "medium" ? 2 : 1);

/* ------------------------------------------------------------ classroom view */

const ClassroomInterior: React.FC<WorldProps> = ({ t, gt, lighting, monitors, dof, par, layer }) => {
  const L = getLighting(lighting);
  const tv = monitors.find((m) => m.id === "tv_screen");
  const ph = monitors.find((m) => m.id === "phone_screen");
  const strobe = Math.sin(gt * (L.pulse ? L.pulse * 2.4 : 3)) > 0.4;
  return (
    <g>
      <defs><ConcreteFilter /></defs>
      {layer === "back" && (<>
      {/* FAR z:-300 — windows, skyline, smoke, emergency strobes */}
      <g transform={`translate(${par * 0.5},0)`} filter={`url(#blur${dofBlur(dof) >= 3 ? 3 : 2})`}>
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#10131c" /><stop offset="0.6" stopColor="#2a1a22" /><stop offset="1" stopColor="#5a2a1e" />
          </linearGradient>
          <clipPath id="winL"><rect x={30} y={220} width={230} height={560} /></clipPath>
          <clipPath id="winR"><rect x={820} y={220} width={230} height={560} /></clipPath>
        </defs>
        {[{ x: 30, c: "winL" }, { x: 820, c: "winR" }].map((win, wi) => (
          <g key={wi} clipPath={`url(#${win.c})`}>
            <rect x={win.x} y={220} width={230} height={560} fill="url(#sky)" />
            {/* skyline */}
            <path d={`M${win.x},700 L${win.x},600 h30 v-70 h26 v60 h20 v-110 h30 v100 h34 v-50 h24 v70 h30 v-30 h16 V780 H${win.x} Z`} fill="#0a0c12" />
            {Array.from({ length: 14 }).map((_, i) => <rect key={i} x={win.x + 14 + (i % 7) * 30} y={560 + Math.floor(i / 7) * 40 + (i % 3) * 8} width={5} height={7} fill="#ffd27a" opacity={0.35 + 0.4 * ((i * 7 + Math.floor(gt * 2)) % 3 === 0 ? 1 : 0)} />)}
            {/* smoke plumes */}
            {[0, 1, 2].map((k) => (
              <ellipse key={k} cx={win.x + 60 + k * 70 + Math.sin(gt * 0.4 + k) * 12} cy={430 - ((gt * 14 + k * 70) % 240)} rx={70} ry={46} fill="#1a1316" opacity={0.55} />
            ))}
            {/* emergency lights */}
            <circle cx={win.x + 150} cy={640} r={30} fill={wi ? "#3a7bff" : "#ff2d3a"} opacity={strobe === !!wi ? 0.85 : 0.12} />
            <circle cx={win.x + 150} cy={640} r={90} fill={wi ? "#3a7bff" : "#ff2d3a"} opacity={strobe === !!wi ? 0.22 : 0} />
          </g>
        ))}
      </g>

      {/* MID z:-120 — textured wall, pipes, chalkboard, TV mount */}
      <g transform={`translate(${par * 1.0},0)`}>
        <defs>
          <linearGradient id="wallG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={L.wall[0]} /><stop offset="1" stopColor={L.wall[1]} />
          </linearGradient>
          <linearGradient id="floorG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={L.floor[0]} /><stop offset="1" stopColor={L.floor[1]} />
          </linearGradient>
        </defs>
        {/* wall with window cut-outs: draw wall around windows */}
        <path d={`M-200,-100 H${W + 200} V1180 H-200 Z M30,220 H260 V780 H30 Z M820,220 H1050 V780 H820 Z`} fill="url(#wallG)" fillRule="evenodd" />
        <path d={`M-200,-100 H${W + 200} V1180 H-200 Z M30,220 H260 V780 H30 Z M820,220 H1050 V780 H820 Z`} fill="#fff" filter="url(#concrete)" opacity={0.13} fillRule="evenodd" />
        <path d={`M-200,820 H${W + 200} V1180 H-200 Z`} fill="#000" opacity={0.18} />
        <path d={`M-200,820 H${W + 200}`} stroke={rgba("#fff", 0.08)} strokeWidth={4} />
        {/* window frames, bars, sills */}
        {[30, 820].map((x) => (
          <g key={x}>
            <rect x={x - 8} y={212} width={246} height={576} fill="none" stroke="#0c0e12" strokeWidth={16} />
            <path d={`M${x + 115},220 V780 M${x},500 H${x + 230}`} stroke="#0c0e12" strokeWidth={10} />
            <rect x={x - 14} y={780} width={258} height={18} fill="#1a1e26" />
            <path d={`M${x},220 L${x + 230},780`} stroke={rgba("#fff", 0.07)} strokeWidth={30} />
          </g>
        ))}
        <rect x={0} y={0} width={W} height={150} fill="#0e1117" />
        <Pipes y={20} c={L.key} />
        {/* wall rust streaks + scratches */}
        <rect x={-200} y={0} width={W + 400} height={1180} fill="#000" filter="url(#rust)" opacity={0.22} />
        <path d="M300,560 l90,-20 M700,860 l70,10 M120,880 l50,-30 M900,420 l-60,40" stroke={rgba("#fff", 0.08)} strokeWidth={2} />
        {/* wall clock */}
        <g transform="translate(900,170)">
          <circle r={34} fill="#14181f" stroke="#0a0c10" strokeWidth={6} />
          <circle r={28} fill="#d9dde3" />
          <path d={`M0,0 L${22 * Math.sin(((14.25 + gt / 60) % 12) * 30 * Math.PI / 180 + 0)},${-22 * Math.cos(((14.25 + gt / 60) % 12) * 30 * Math.PI / 180)}`} stroke="#111" strokeWidth={3} />
          <path d={`M0,0 L${14 * Math.sin((gt * 6) * Math.PI / 180)},${-14 * Math.cos((gt * 6) * Math.PI / 180)}`} stroke="#ff2d3a" strokeWidth={1.5} />
        </g>
        {/* TV mount + TV (recurring prop: tv_broadcast_banner @ [0.5,0.15]) */}
        <g transform={`translate(${W * 0.5},${H * 0.15 + 30}) scale(0.86) translate(-270,-155)`}>
          <path d="M270,-30 V0 M170,-30 H370" stroke="#0a0c10" strokeWidth={10} />
          <rect x={-8} y={-8} width={556} height={326} rx={14} fill="#0a0c10" stroke="#1d222b" strokeWidth={4} />
          <svg x={14} y={6} width={512} height={298} viewBox="0 0 512 298"><MonitorScreen m={tv} fallback="emergency_broadcast_signal" w={512} h={298} t={t + gt * 0} /></svg>
          <rect x={14} y={6} width={512} height={298} fill={`url(#tvGlare)`} />
          <defs><linearGradient id="tvGlare" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity={0.12} /><stop offset="0.4" stopColor="#fff" stopOpacity={0} /></linearGradient></defs>
          <circle cx={520} cy={314} r={4} fill={strobe ? "#ff2d3a" : "#400"} />
        </g>
        {/* volumetric TV glow on wall */}
        <ellipse cx={W / 2} cy={H * 0.15 + 30} rx={420} ry={260} fill={rgba(tv?.status === "danger" ? "#ff2d3a" : "#ffb02e", 0.1)} filter="url(#blurSoft)" />
        {/* chalkboard */}
        <g transform="translate(250,480)">
          <rect x={-12} y={-12} width={604} height={364} rx={6} fill="#4a3a28" />
          <rect width={580} height={340} fill="#1a2420" />
          <rect width={580} height={340} fill="#fff" filter="url(#concrete)" opacity={0.12} />
          <text x={30} y={60} fontFamily={FONT_MONO} fontSize={34} fill="#e7efe9" opacity={0.75}>HISTORY TEST — Q7</text>
          <path d="M30,100 h300 M30,130 h240 M30,160 h280" stroke="#e7efe9" strokeOpacity={0.35} strokeWidth={4} strokeLinecap="round" />
          <path d="M360,90 q60,-40 120,0 t100,10 M380,200 l60,-50 l60,40 l50,-30" stroke="#e7efe9" strokeOpacity={0.4} strokeWidth={4} fill="none" strokeLinecap="round" />
          <path d="M20,310 h540" stroke="#cfd6cc" strokeOpacity={0.3} strokeWidth={6} />
          <rect x={60} y={318} width={46} height={12} rx={3} fill="#e9e4d6" />
        </g>
        {/* floor */}
        <rect x={-200} y={1180} width={W + 400} height={H - 1180 + 200} fill="url(#floorG)" />
        {Array.from({ length: 8 }).map((_, i) => <path key={i} d={`M${540 + (i - 3.5) * 40},1180 L${540 + (i - 3.5) * 260},${H + 100}`} stroke={rgba("#000", 0.4)} strokeWidth={3} />)}
        {Array.from({ length: 6 }).map((_, i) => <path key={i} d={`M-200,${1220 + i * i * 22} H${W + 200}`} stroke={rgba("#000", 0.35)} strokeWidth={3} />)}
        {/* mid desks (rows behind hero) */}
        {[120, 470, 830].map((x, i) => (
          <g key={i} transform={`translate(${x},${1010 + (i === 1 ? 14 : 0)})`}>
            <rect x={0} y={0} width={200} height={14} fill="#3a2a1c" />
            <rect x={0} y={14} width={200} height={6} fill="#241a10" />
            <rect x={10} y={20} width={8} height={130} fill="#111" /><rect x={182} y={20} width={8} height={130} fill="#111" />
            <rect x={54} y={-18} width={90} height={18} rx={2} fill="#e9e6dc" opacity={0.85} />
            <rect x={60} y={-10} width={70} height={3} fill="#7a7d86" />
          </g>
        ))}
        {/* key-light rim sweep on wall */}
        <rect x={-200} y={0} width={W + 400} height={1180} fill={rgba(L.key, 0.04)} />
      </g>

      </>)}

      {layer === "front" && (
      <g transform={`translate(${par * 1.7},0)`}>
        <path d={`M-300,1290 H${W + 300} L${W + 340},${H + 200} H-340 Z`} fill="#2b1d12" />
        <path d={`M-300,1290 H${W + 300} V1318 H-300 Z`} fill="#4a3220" />
        <path d={`M-300,1290 H${W + 300}`} stroke={rgba(L.key, 0.6)} strokeWidth={3} />
        <path d={`M-300,1320 H${W + 300} V1330 H-300 Z`} fill="#000" opacity={0.35} />
        <rect x={-300} y={1290} width={W + 600} height={H} fill="#fff" filter="url(#concrete)" opacity={0.06} />
        {/* wood grain */}
        {Array.from({ length: 10 }).map((_, i) => <path key={i} d={`M-300,${1350 + i * 54} q300,-14 600,0 t600,0 t600,0`} stroke="#000" strokeOpacity={0.18} strokeWidth={2} fill="none" />)}
        {/* notebook + pen */}
        <g transform="translate(180,1400) rotate(-6)">
          <rect width={250} height={170} rx={6} fill="#e6e1d4" stroke="#7a756a" strokeWidth={3} />
          <path d="M125,0 V170" stroke="#9a958a" strokeWidth={3} />
          {Array.from({ length: 7 }).map((_, i) => <path key={i} d={`M16,${28 + i * 20} h96 M138,${28 + i * 20} h96`} stroke="#6c8fc9" strokeOpacity={0.6} strokeWidth={2} />)}
        </g>
        <g transform="translate(470,1520) rotate(24)"><rect width={190} height={14} rx={7} fill="#1d4ed8" /><rect x={170} width={22} height={14} rx={7} fill="#0f172a" /></g>
        {/* cracked_smartphone @ [0.65,0.72] — lying on the desk, screen live */}
        <g transform={`translate(${W * 0.65},${H * 0.72}) rotate(-14)`}>
          <ellipse cx={0} cy={0} rx={190} ry={120} fill={rgba(ph?.status === "danger" ? "#ff2d3a" : "#ffb02e", 0.22)} filter="url(#blurSoft)" />
          <rect x={-70} y={-130} width={140} height={260} rx={20} fill="#0a0c10" stroke="#323843" strokeWidth={4} />
          <svg x={-62} y={-120} width={124} height={240} viewBox="0 0 124 240"><MonitorScreen m={ph} fallback="phone_lock_screen_alert" w={124} h={240} t={t} /></svg>
          <path d="M-30,-120 L-12,-40 L-50,10 L-26,70 L-4,130 M-12,-40 L40,-14 L62,60 M-50,10 L-62,20" stroke="#fff" strokeOpacity={0.6} strokeWidth={1.8} fill="none" />
          <rect x={-18} y={-124} width={36} height={6} rx={3} fill="#000" />
        </g>
        {/* blurred foreground wires & lamp */}
        <g filter="url(#blur5)" opacity={0.75}>
          <path d="M-30,0 q60,260 150,300 M1110,0 q-40,200 -150,340 M300,0 q20,90 -10,160" stroke="#07080a" strokeWidth={14} fill="none" />
        </g>
      </g>
      )}
    </g>
  );
};

/* --------------------------------------------------------------- door view */

const Silhouette: React.FC<{ x: number; y: number; s: number; reach?: number; pale?: boolean; c: string }> = ({ x, y, s, reach = 0, pale, c }) => (
  <g transform={`translate(${x},${y}) scale(${s})`} opacity={pale ? 0.95 : 0.8}>
    <ellipse cx={0} cy={-120} rx={24} ry={30} fill={pale ? "#cfd3d8" : "#050507"} />
    <path d={`M-60,0 Q-64,-70 -22,-90 L22,-90 Q64,-70 60,0 Z`} fill={pale ? "#aab0b8" : "#050507"} />
    <path d={`M-58,-70 Q${-90 - reach},-20 ${-80 - reach},${40 - reach} M58,-70 Q${90 + reach},-30 ${84 + reach},${30 - reach * 1.4}`} stroke={pale ? "#aab0b8" : "#050507"} strokeWidth={22} fill="none" strokeLinecap="round" />
    <rect x={-120} y={-160} width={240} height={200} fill={c} opacity={0.18} />
  </g>
);

const DoorView: React.FC<WorldProps> = ({ t, gt, lighting, monitors, dof, par, heroChoiceT, sceneId, layer }) => {
  const L = getLighting(lighting);
  const lockM = monitors.find((m) => m.id === "door_lock_status_indicator");
  const sealed = gt >= heroChoiceT;
  const strobe = 0.5 + 0.5 * Math.sin(gt * 7.5);
  const shadowT = Math.max(0, gt - 48);
  const knock = [65.3, 66.4, 67.5].some((k) => gt >= k && gt < k + 0.18);
  const showHarper = gt >= 62;
  return (
    <g>
      <defs><ConcreteFilter /></defs>
      {layer === "back" && (<>
      {/* FAR — hallway seen through the door glass: red strobe + moving silhouettes */}
      <g transform={`translate(${par * 0.5},0)`}>
        <defs>
          <linearGradient id="hall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a0508" /><stop offset="1" stopColor="#12020a" /></linearGradient>
          <clipPath id="glassClip"><rect x={430} y={370} width={220} height={440} rx={6} /></clipPath>
        </defs>
        <rect x={-200} y={0} width={W + 400} height={H} fill="#0c0508" />
        <g clipPath="url(#glassClip)" filter={`url(#blur${dofBlur(dof) >= 3 ? 3 : 2})`}>
          <rect x={430} y={370} width={220} height={440} fill="url(#hall)" />
          <rect x={430} y={370} width={220} height={440} fill="#ff2d3a" opacity={0.12 + strobe * 0.34} />
          {/* hallway perspective lines */}
          <path d="M430,500 L520,560 M650,500 L560,560 M430,700 L510,650 M650,700 L570,650 M520,560 H560 V650 H520 Z" stroke="#4a0a10" strokeWidth={3} fill="none" />
          {sceneId.includes("05") || sceneId.includes("04") ? (
            <>
              {[0, 1, 2].map((i) => <Silhouette key={i} x={440 + i * 90 + Math.sin(gt * 2 + i) * 10} y={860 - Math.min(shadowT, 9) * 18 - i * 20} s={0.55 + Math.min(shadowT, 9) * 0.06 + i * 0.04} reach={Math.sin(gt * 5 + i) * 10 + 12} c="#ff2d3a" />)}
              {gt > 55 && <Silhouette x={560} y={880} s={1.25} pale reach={14} c="#fff" />}
            </>
          ) : null}
          {showHarper && <Silhouette x={540 + Math.sin(gt * 1.4) * 4} y={930} s={1.6 + (knock ? 0.04 : 0)} pale reach={knock ? 34 : 6} c="#fff" />}
        </g>
      </g>

      {/* MID — steel wall, reinforced door, lock panel */}
      <g transform={`translate(${par},0)`}>
        <defs>
          <linearGradient id="wallD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={L.wall[0]} /><stop offset="1" stopColor={L.wall[1]} /></linearGradient>
          <linearGradient id="steel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#3a424d" /><stop offset="0.5" stopColor="#566070" /><stop offset="1" stopColor="#2c333c" /></linearGradient>
          <linearGradient id="floorD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={L.floor[0]} /><stop offset="1" stopColor={L.floor[1]} /></linearGradient>
        </defs>
        <path d={`M-200,-100 H${W + 200} V1330 H-200 Z M300,300 H780 V1300 H300 Z`} fill="url(#wallD)" fillRule="evenodd" />
        <rect x={-200} y={0} width={W + 400} height={1330} fill="#fff" filter="url(#concrete)" opacity={0.12} />
        <rect x={-200} y={0} width={W + 400} height={1330} fill="#000" filter="url(#rust)" opacity={0.25} />
        <Pipes y={20} c={L.key} />
        {/* wall panels + rivets */}
        {Array.from({ length: 5 }).map((_, i) => <path key={i} d={`M${-100 + i * 270},160 V1300`} stroke={rgba("#000", 0.35)} strokeWidth={4} />)}
        {Array.from({ length: 20 }).map((_, i) => <circle key={i} cx={60 + (i % 5) * 235} cy={220 + Math.floor(i / 5) * 280} r={5} fill="#0c0e12" />)}
        {/* door frame */}
        <path d="M282,282 H798 V1320 H282 Z M430,370 H650 V810 H430 Z" fill="#0a0c10" fillRule="evenodd" />
        {/* door slab */}
        <path d="M300,300 H780 V1300 H300 Z M430,370 H650 V810 H430 Z" fill="url(#steel)" stroke="#1a1e26" strokeWidth={6} fillRule="evenodd" />
        <path d="M300,300 H780 V1300 H300 Z M430,370 H650 V810 H430 Z" fill="#000" filter="url(#rust)" opacity={0.2} fillRule="evenodd" />
        <rect x={330} y={330} width={420} height={940} fill="none" stroke={rgba("#000", 0.45)} strokeWidth={5} />
        {Array.from({ length: 12 }).map((_, i) => <circle key={i} cx={i < 6 ? 316 : 764} cy={330 + (i % 6) * 180} r={5} fill="#15181e" />)}
        {/* hinges */}
        {[380, 800, 1180].map((hy) => <rect key={hy} x={292} y={hy} width={18} height={80} rx={4} fill="#0b0d10" />)}
        {/* reinforced glass slit */}
        <rect x={420} y={360} width={240} height={460} rx={8} fill="none" stroke="#0a0c10" strokeWidth={20} />
        <path d="M430,370 H650 V810 H430 Z" fill="none" />
        {Array.from({ length: 12 }).map((_, i) => <path key={i} d={`M430,${370 + i * 40} H650`} stroke="#9fb0c4" strokeOpacity={0.12} strokeWidth={1.5} />)}
        {Array.from({ length: 6 }).map((_, i) => <path key={i} d={`M${430 + i * 44},370 V810`} stroke="#9fb0c4" strokeOpacity={0.12} strokeWidth={1.5} />)}
        <path d="M440,380 L640,800" stroke="#fff" strokeOpacity={0.1} strokeWidth={24} />
        {knock && <rect x={430} y={370} width={220} height={440} fill="#fff" opacity={0.12} />}
        {/* handle + deadbolt */}
        <g transform="translate(700,880)">
          <rect x={-20} y={-60} width={40} height={120} rx={12} fill="#1a1e26" />
          <rect x={-8} y={-34} width={64} height={18} rx={9} fill="#9aa4b2" />
          <rect x={-8} y={-34} width={64} height={5} rx={2.5} fill="#fff" opacity={0.4} />
          <rect x={-60} y={86} width={120} height={46} rx={6} fill="#14181f" />
          <rect x={-70} y={96} width={sealed ? 70 : 8} height={26} rx={4} fill="#c4ccd6" />
          <circle cx={0} cy={109} r={10} fill="#0a0c10" />
        </g>
        {/* electronic_lock_panel @ [0.78,0.48] — live status display */}
        <g transform={`translate(${W * 0.78 - 72},${H * 0.48 - 100})`}>
          <rect x={-8} y={-8} width={160} height={216} rx={12} fill="#0a0c10" stroke="#2b323c" strokeWidth={4} />
          <svg x={4} y={4} width={136} height={150} viewBox="0 0 136 150"><MonitorScreen m={lockM} fallback="lockdown_engaged" w={136} h={150} t={t} sealed={sealed} /></svg>
          {[0, 1, 2].map((r) => [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={14 + c * 40} y={164 + r * 13} width={30} height={9} rx={2} fill="#1a1e26" stroke="#3a424d" />))}
          <ellipse cx={68} cy={80} rx={150} ry={170} fill={rgba(sealed ? "#ff2d3a" : "#ffd23f", 0.14)} filter="url(#blurSoft)" />
        </g>
        {/* floor */}
        <rect x={-200} y={1330} width={W + 400} height={H} fill="url(#floorD)" />
        <path d={`M-200,1330 H${W + 200}`} stroke={rgba(L.key, 0.5)} strokeWidth={3} />
        {/* red strobe spill under door */}
        <path d="M300,1300 H780 L900,1500 H180 Z" fill="#ff2d3a" opacity={0.12 + strobe * 0.2} />
      </g>

      </>)}

      {/* FOREGROUND z:+120 — wooden school desks ready to push (drawn OVER the characters, hides the waist crop) */}
      {layer === "front" && (
        <g transform={`translate(${par * 1.7},0)`}>
          <g filter="url(#blur3)">
            <path d="M-260,1196 H640 L690,1330 H-300 Z" fill="#33231a" />
            <path d="M-260,1196 H640 V1222 H-260 Z" fill="#5a3f2a" />
            <path d="M-260,1222 H640" stroke={rgba(L.key, 0.7)} strokeWidth={3} />
            <path d="M-300,1330 H690 V1920 H-300 Z" fill="#1c130c" />
            <path d="M560,1246 H1340 L1380,1360 H520 Z" fill="#33231a" />
            <path d="M560,1246 H1340 V1272 H560 Z" fill="#5a3f2a" />
            <path d="M560,1272 H1340" stroke={rgba(L.key, 0.7)} strokeWidth={3} />
            <path d="M520,1360 H1380 V1920 H520 Z" fill="#150e09" />
            {Array.from({ length: 6 }).map((_, i) => <path key={i} d={`M-260,${1236 + i * 16} q300,-8 900,0`} stroke="#000" strokeOpacity={0.22} strokeWidth={2} fill="none" />)}
          </g>
          <g filter="url(#blur5)" opacity={0.8}>
            <path d="M-30,0 q40,220 130,280 M1110,0 q-30,180 -120,300" stroke="#07080a" strokeWidth={14} fill="none" />
          </g>
        </g>
      )}
    </g>
  );
};

export const World: React.FC<WorldProps> = (p) => {
  void Fog;
  return p.bg === "classroom_door_view" ? <DoorView {...p} /> : <ClassroomInterior {...p} />;
};

export const WORLD_SIZE = { W, H };
