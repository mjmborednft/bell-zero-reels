import React from "react";
import { COLORS, FONT_DISPLAY, FONT_MONO, SAFE, W } from "./tokens";
import { Episode, Label } from "./types";
import { clamp, ease, fmtClock, lerp, rgba } from "./util";

/** current value + animation progress for a counter at episode time gt */
const counterAt = (c: Episode["hud"]["counters"][number], gt: number) => {
  const evs = [...(c.events ?? [])].sort((a, b) => a.t - b.t);
  let prev = c.value, cur = c.value, since = 99;
  for (const e of evs) {
    if (gt >= e.t) { prev = cur; cur = e.value; since = gt - e.t; }
  }
  return { prev, cur, since };
};

const num = (s: string) => {
  const m = s.match(/-?\d+/);
  return m ? parseInt(m[0], 10) : null;
};

const Cell: React.FC<{ w: number; label: string; value: string; color: string; flash: number; mono?: boolean; big?: boolean }> = ({ w, label, value, color, flash, big }) => (
  <div
    style={{
      width: w,
      height: 82,
      boxSizing: "border-box",
      padding: "8px 14px",
      background: COLORS.hudBg,
      border: `2px solid ${rgba(color, 0.55 + flash * 0.45)}`,
      borderRadius: 8,
      boxShadow: `0 0 ${10 + flash * 28}px ${rgba(color, 0.25 + flash * 0.5)}, inset 0 0 18px ${rgba(color, 0.12)}`,
      position: "relative",
      overflow: "hidden",
    }}
  >
    <div style={{ fontFamily: FONT_MONO, fontSize: 15, letterSpacing: 2, color: rgba("#ffffff", 0.7), whiteSpace: "nowrap" }}>{label}</div>
    <div style={{ fontFamily: FONT_DISPLAY, fontSize: big ? 40 : 42, color, lineHeight: 1.1, marginTop: 2, whiteSpace: "nowrap", textShadow: `0 0 ${8 + flash * 18}px ${rgba(color, 0.7)}` }}>{value}</div>
    <div style={{ position: "absolute", left: 0, top: 0, width: 4, height: "100%", background: color }} />
  </div>
);

export const HUD: React.FC<{ ep: Episode; gt: number }> = ({ ep, gt }) => {
  const clock = fmtClock(ep.hud.clock_start, gt);
  const cells = ep.hud.counters.map((c) => {
    const { prev, cur, since } = counterAt(c, gt);
    const flash = since < 1.2 ? 1 - since / 1.2 : 0;
    const a = num(prev), b = num(cur);
    let shown = cur;
    if (a !== null && b !== null && since < 0.8) {
      const v = Math.round(lerp(a, b, ease("easeOut", since / 0.8)));
      shown = cur.includes("%") ? `${v}%` : String(v);
    } else if (a === null && since < 0.35 && Math.floor(gt * 30) % 2 === 0) {
      shown = cur.split("").map((ch, i) => (i % 3 === 0 ? "#" : ch)).join("");   // glitch flip for text states
    }
    let color: string = COLORS.white;
    if (c.id === "battery") color = (b ?? 100) < 80 ? COLORS.yellow : COLORS.ok;
    if (c.id === "infected") color = (b ?? 0) > 0 ? COLORS.red : COLORS.ok;
    if (c.id === "lockdown") color = cur === "NORMAL" ? COLORS.ok : COLORS.red;
    return { c, shown, color, flash };
  });
  const widths: Record<string, number> = { battery: 240, infected: 220, lockdown: 290 };
  return (
    <div style={{ position: "absolute", left: SAFE.side, top: SAFE.top, width: W - SAFE.side * 2, display: "flex", gap: 10 }}>
      <Cell w={190} label="TIME" value={clock} color={COLORS.white} flash={0} />
      {cells.map(({ c, shown, color, flash }) => (
        <Cell key={c.id} w={widths[c.id] ?? 230} label={c.label} value={shown} color={color} flash={flash} />
      ))}
    </div>
  );
};

export const Labels: React.FC<{ labels: Label[]; gt: number; sceneEnd: number }> = ({ labels, gt, sceneEnd }) => (
  <>
    {labels.map((l, i) => {
      const end = Math.min(sceneEnd, l.t + 3.2);
      if (gt < l.t || gt > end) return null;
      const p = clamp((gt - l.t) / 0.25);
      const out = clamp((end - gt) / 0.25);
      const sc = lerp(1.5, 1, ease("easeOut", p));
      const danger = /ALERT|HOSTILE|BREACH|LOCKDOWN|SEALED|BIO/.test(l.text);
      const col = /SEALED/.test(l.text) ? COLORS.red : danger ? COLORS.yellow : COLORS.white;
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            left: l.anchor[0] * 1080,
            top: l.anchor[1] * 1920,
            transform: `translate(-50%,-50%) scale(${sc})`,
            opacity: Math.min(p, out),
            padding: "10px 22px",
            background: "rgba(5,8,12,0.78)",
            border: `3px solid ${col}`,
            fontFamily: FONT_MONO,
            fontWeight: 800,
            fontSize: 38,
            letterSpacing: 3,
            color: col,
            whiteSpace: "nowrap",
            boxShadow: `0 0 24px ${rgba(col, 0.55)}`,
          }}
        >
          {/* corner brackets */}
          {[[-8, -8], [1, -8], [-8, 1], [1, 1]].map(([dx, dy], k) => (
            <span key={k} style={{ position: "absolute", width: 14, height: 14, background: col, left: dx < 0 ? -8 : "auto", right: dx > 0 ? -8 : "auto", top: dy < 0 ? -8 : "auto", bottom: dy > 0 ? -8 : "auto" }} />
          ))}
          {l.text}
        </div>
      );
    })}
  </>
);
