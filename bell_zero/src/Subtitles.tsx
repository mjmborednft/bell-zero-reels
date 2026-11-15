import React from "react";
import { COLORS, FONT_DISPLAY } from "./tokens";
import { Alignment, Scene, SubColor, WordTiming } from "./types";
import { clamp, ease, lerp, rgba } from "./util";

interface Tok { w: string; color: SubColor; s: number }
interface Chunk { s: number; e: number; toks: Tok[] }

const norm = (s: string) => s.toLowerCase().replace(/[^a-zа-я0-9]/gi, "");

/** Build 1–3 word kinetic chunks for a scene, driven by real word timestamps when available. */
export const buildChunks = (scene: Scene, align: Alignment | null): Chunk[] => {
  const aw: WordTiming[] = align?.scenes?.[scene.id] ?? [];
  const out: Chunk[] = [];
  let cursor = 0;
  scene.subs.forEach((g, gi) => {
    const toks: { w: string; color: SubColor }[] = [];
    g.words.forEach((seg) => seg.w.split(/\s+/).filter(Boolean).forEach((w) => toks.push({ w, color: seg.color })));
    const nextT = scene.subs[gi + 1]?.t ?? Math.min(scene.t[1], g.t + 2.8);
    const winEnd = Math.min(nextT, scene.t[1]);
    // locate tokens in the aligned VO
    let matched: number[] | null = null;
    if (aw.length) {
      for (let st = cursor; st < aw.length && !matched; st++) {
        let k = st; const idx: number[] = [];
        for (const tk of toks) {
          while (k < aw.length && norm(aw[k].w) !== norm(tk.w) && k - st < toks.length + 4) k++;
          if (k < aw.length && norm(aw[k].w) === norm(tk.w)) { idx.push(k); k++; } else break;
        }
        if (idx.length === toks.length) matched = idx;
      }
      if (matched) cursor = matched[matched.length - 1] + 1;
    }
    const times: number[] = matched
      ? matched.map((i) => aw[i].s)
      : toks.map((_, i) => lerp(g.t, Math.max(g.t + 0.4, winEnd - 0.5), toks.length > 1 ? i / toks.length : 0));
    const endAbs = matched ? Math.min(scene.t[1], aw[matched[matched.length - 1]].e + 0.55) : winEnd;
    for (let i = 0; i < toks.length; i += 3) {
      const part = toks.slice(i, i + 3);
      const s = times[i] - 0.05;
      const e = i + 3 < toks.length ? times[i + 3] - 0.05 : endAbs;
      out.push({ s, e: Math.max(e, s + 0.5), toks: part.map((t, k) => ({ ...t, s: times[i + k] })) });
    }
  });
  return out;
};

const COL: Record<SubColor, string> = { white: COLORS.white, red: COLORS.red, yellow: COLORS.yellow };

export const KineticSubs: React.FC<{ chunks: Chunk[]; gt: number }> = ({ chunks, gt }) => {
  const ch = chunks.find((c) => gt >= c.s && gt < c.e);
  if (!ch) return null;
  const p = clamp((gt - ch.s) / 0.14);
  const pop = ease("easeOut", p);
  const over = 1 + Math.sin(clamp((gt - ch.s) / 0.22) * Math.PI) * 0.1;
  const out = clamp((ch.e - gt) / 0.08);
  const chars = ch.toks.reduce((a, t) => a + t.w.length + 1, 0);
  const size = chars <= 14 ? 118 : chars <= 22 ? 98 : 80;
  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        top: 1250,
        height: 200,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "wrap",
        columnGap: 24,
        transform: `scale(${lerp(0.7, 1, pop) * over}) rotate(${lerp(-2.5, 0, pop)}deg)`,
        opacity: pop * out,
        fontFamily: FONT_DISPLAY,
        fontSize: size,
        textTransform: "uppercase",
        lineHeight: 1.02,
        textAlign: "center",
      }}
    >
      {ch.toks.map((t, i) => {
        const active = gt >= t.s;
        const current = active && (i === ch.toks.length - 1 || gt < ch.toks[i + 1].s);
        return (
          <span
            key={i}
            style={{
              color: COL[t.color],
              opacity: active ? 1 : 0.5,
              transform: `scale(${current ? 1.12 : 1})`,
              display: "inline-block",
              WebkitTextStroke: `${size * 0.1}px #05070a`,
              paintOrder: "stroke fill",
              textShadow: `0 6px 0 #05070a, 0 0 ${current ? 34 : 14}px ${rgba(COL[t.color], current ? 0.85 : 0.35)}`,
            }}
          >
            {t.w}
          </span>
        );
      })}
    </div>
  );
};
