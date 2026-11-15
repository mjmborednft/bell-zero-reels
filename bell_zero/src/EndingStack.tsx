import React from "react";
import { COLORS, FONT_DISPLAY, FONT_MONO } from "./tokens";
import { Episode } from "./types";
import { clamp, ease, lerp, rgba } from "./util";

const C = { white: COLORS.white, red: COLORS.red, yellow: COLORS.yellow };

/**
 * Ending stack (fits the ending_card scene window):
 *  question card -> 2-option equal-cost poll -> CTA -> next-day teaser
 * Timings are fractions of the scene window so it adapts to any episode length.
 */
export const EndingStack: React.FC<{ ep: Episode; gt: number; t0: number; t1: number }> = ({ ep, gt, t0, t1 }) => {
  const d = t1 - t0;
  const q0 = t0 + d * 0.04, q1 = t0 + d * 0.41;
  const p0 = t0 + d * 0.41, p1 = t0 + d * 0.88;
  const cta0 = t0 + d * 0.66;
  const tz0 = t0 + d * 0.88;
  const E = ep.ending;

  const wrap: React.CSSProperties = { position: "absolute", left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center" };

  /* 1. question */
  let question: React.ReactNode = null;
  if (gt >= q0 && gt < q1) {
    const p = ease("easeOut", clamp((gt - q0) / 0.35));
    const out = clamp((q1 - gt) / 0.25);
    question = (
      <div style={{ ...wrap, top: 560, opacity: Math.min(p, out), transform: `scale(${lerp(1.25, 1, p)})` }}>
        {E.question.map((l, i) => (
          <div
            key={i}
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 128,
              lineHeight: 1.05,
              color: C[l.color],
              WebkitTextStroke: "12px #05070a",
              paintOrder: "stroke fill",
              textShadow: `0 8px 0 #05070a, 0 0 40px ${rgba(C[l.color], 0.6)}`,
              transform: `translateX(${(1 - ease("easeOut", clamp((gt - q0 - i * 0.18) / 0.3))) * (i % 2 ? 160 : -160)}px)`,
              textAlign: "center",
            }}
          >
            {l.line}
          </div>
        ))}
      </div>
    );
  }

  /* 2. poll (two equal-cost cards: same size, same weight) */
  let poll: React.ReactNode = null;
  if (gt >= p0 && gt < tz0) {
    const p = ease("easeOut", clamp((gt - p0) / 0.4));
    const out = clamp((tz0 - gt) / 0.2);
    poll = (
      <div style={{ ...wrap, top: 520, opacity: Math.min(p, out), transform: `translateY(${(1 - p) * 60}px)` }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 74, color: C.white, WebkitTextStroke: "9px #05070a", paintOrder: "stroke fill", marginBottom: 34, textAlign: "center" }}>{E.poll.prompt}</div>
        <div style={{ display: "flex", gap: 36, alignItems: "stretch" }}>
          {E.poll.options.map((o) => (
            <div
              key={o.n}
              style={{
                width: 440,
                height: 380,
                boxSizing: "border-box",
                background: "rgba(6,10,16,0.86)",
                border: `5px solid ${o.n === 1 ? COLORS.yellow : COLORS.red}`,
                borderRadius: 14,
                padding: 28,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 0 34px ${rgba(o.n === 1 ? COLORS.yellow : COLORS.red, 0.45)}`,
              }}
            >
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 130, lineHeight: 1, color: o.n === 1 ? COLORS.yellow : COLORS.red }}>{o.n}</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 64, color: C.white, marginTop: 6, textAlign: "center" }}>{o.title}</div>
              <div style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 30, letterSpacing: 1, color: rgba("#ffffff", 0.82), marginTop: 12, textAlign: "center", textTransform: "uppercase" }}>{o.sub}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* 3. CTA */
  let cta: React.ReactNode = null;
  if (gt >= cta0 && gt < tz0) {
    const p = ease("easeOut", clamp((gt - cta0) / 0.3));
    const pulse = 1 + 0.03 * Math.sin(gt * 9);
    cta = (
      <div style={{ ...wrap, top: 1060, opacity: p }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 56, color: "#05070a", background: COLORS.yellow, padding: "14px 34px", transform: `scale(${pulse})`, boxShadow: `0 0 40px ${rgba(COLORS.yellow, 0.6)}` }}>{E.cta}</div>
      </div>
    );
  }

  /* 4. teaser */
  let teaser: React.ReactNode = null;
  if (gt >= tz0) {
    const p = ease("easeOut", clamp((gt - tz0) / 0.25));
    teaser = (
      <div style={{ position: "absolute", inset: 0, background: `rgba(3,4,7,${0.85 * p})`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingBottom: 200 }}>
        <div style={{ fontFamily: FONT_MONO, fontWeight: 800, fontSize: 40, letterSpacing: 14, color: COLORS.red, opacity: p }}>{E.teaser.kicker}</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 220, lineHeight: 1, color: C.white, WebkitTextStroke: "12px #05070a", paintOrder: "stroke fill", transform: `scale(${lerp(1.3, 1, p)})`, opacity: p }}>{E.teaser.title}</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 110, color: COLORS.red, WebkitTextStroke: "8px #05070a", paintOrder: "stroke fill", opacity: p }}>{E.teaser.sub}</div>
      </div>
    );
  }

  return (
    <>
      {question}
      {poll}
      {cta}
      {teaser}
    </>
  );
};
