import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CharacterRig, RIG_ANCHOR } from "./CharacterRig";
import { ChromaticDefs, LightingLayer } from "./LightingLayer";
import { EndingStack } from "./EndingStack";
import { HUD, Labels } from "./HUD";
import { KineticSubs, buildChunks } from "./Subtitles";
import { COLORS, H, W, getLighting } from "./tokens";
import { Alignment, CharBible, Episode as EpisodeT, Scene } from "./types";
import { clamp, ease, lerp, rgba } from "./util";
import { World } from "./WorldEngine";
import { CHAR_SCALE, facingLeft } from "./layout";

export interface EpisodeProps {
  episode: EpisodeT | null;
  characters: CharBible[];
  alignment: Alignment | null;
  voAmp: number[] | null;   // per-frame voice amplitude 0..1 (from vo_full.wav) or null
  hasMix: boolean;
}


const sceneAt = (ep: EpisodeT, gt: number): Scene =>
  ep.scenes.find((s) => gt >= s.t[0] && gt < s.t[1]) ?? ep.scenes[ep.scenes.length - 1];

/** Fallback speech-like envelope used only until real VO audio exists (QA sheets). */
const fakeAmp = (gt: number, sc: Scene) => {
  const within = gt - sc.t[0] - 0.2;
  const dur = Math.min(sc.t[1] - sc.t[0] - 0.4, sc.vo.split(" ").length / 2.6);
  if (within < 0 || within > dur) return 0;
  return clamp(0.25 + 0.6 * Math.abs(Math.sin(gt * 11) * Math.sin(gt * 4.3 + 1)));
};

export const EpisodeComp: React.FC<EpisodeProps> = ({ episode, characters, alignment, voAmp, hasMix }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!episode) return <AbsoluteFill style={{ background: "#000" }} />;

  const gt = frame / fps;
  const sc = sceneAt(episode, gt);
  const lt = gt - sc.t[0];
  const dur = sc.t[1] - sc.t[0];
  const prog = clamp(lt / dur);
  const L = getLighting(sc.lighting);

  /* ---------------- camera ---------------- */
  let zoom = lerp(sc.camera.from, sc.camera.to, ease(sc.camera.easing, prog));
  let tx = 0, ty = 0, ca = 0;
  switch (sc.camera.move) {
    case "pan_l": tx = lerp(-60, 60, ease("easeInOut", prog)); break;
    case "pan_r": tx = lerp(60, -60, ease("easeInOut", prog)); break;
    case "drift": tx = lerp(-25, 25, prog); ty = lerp(12, -12, prog); break;
    case "punch_zoom": {
      const q = clamp(lt / 0.6);
      zoom = lerp(sc.camera.from, sc.camera.to, ease("easeOut", q)) + prog * 0.02;
      ca = lt < 0.7 ? (1 - clamp(lt / 0.7)) * 7 : 0;
      break;
    }
    default: break;
  }
  // impact shake on door slams / static bursts
  let shake = 0;
  episode.scenes.forEach((s) => s.sfx.forEach((x) => {
    const dt = gt - x.t;
    if (dt >= 0 && dt < 0.7 && (x.id === "door_slam" || x.id === "static_burst")) shake += (x.id === "door_slam" ? 16 : 4) * Math.exp(-dt * 7);
  }));
  const sx = Math.sin(frame * 2.1) * shake, sy = Math.cos(frame * 2.9) * shake * 0.8;

  /* ---------------- characters ---------------- */
  const amp = voAmp ? voAmp[Math.min(voAmp.length - 1, frame)] ?? 0 : fakeAmp(gt, sc);
  const phoneMon = sc.bg_monitors.find((m) => m.id === "phone_screen");
  const phoneGlow = phoneMon?.content === "school_cctv_feed" ? "#2eff8a" : "#ff2d3a";

  const chars = sc.characters.map((c, i) => {
    const bible = characters.find((b) => b.id === c.rig);
    if (!bible) return null;
    const s = CHAR_SCALE[c.rig] ?? 1.1;
    const flip = facingLeft(sc, c);
    return (
      <div key={c.rig + i} style={{ position: "absolute", left: c.pos[0] * W - RIG_ANCHOR.x * s, top: c.pos[1] * H - RIG_ANCHOR.y * s }}>
        <CharacterRig
          bible={bible}
          uid={`${c.rig}-${i}`}
          frame={frame}
          fps={fps}
          action={c.action}
          emotion={c.emotion}
          mouthAmp={amp}
          keyColor={L.key}
          props={c.props}
          flip={flip}
          scale={s}
          phoneGlow={phoneGlow}
        />
      </div>
    );
  });

  const worldProps = {
    bg: sc.bg,
    t: lt,
    gt,
    lighting: sc.lighting,
    monitors: sc.bg_monitors,
    dof: sc.atmosphere.dof,
    par: (tx + sx) * 0.6,
    heroChoiceT: episode.hero_choice.t,
    sceneId: sc.id,
  };

  /* ---------------- overlays ---------------- */
  const chunks = buildChunks(sc, alignment);
  const isEnding = sc.type === "ending_card";
  const sinceCut = (frame - Math.round(sc.t[0] * fps)) / fps;
  const cutFlash = sinceCut >= 0 && sinceCut < 0.17 && sc.t[0] > 0 ? 1 - sinceCut / 0.17 : 0;

  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <ChromaticDefs amount={ca} />
      {hasMix && <Audio src={staticFile("audio/mix.wav")} />}

      {/* camera group: world + characters + light */}
      <AbsoluteFill style={{ transform: `translate(${tx + sx}px,${ty + sy}px) scale(${zoom})`, transformOrigin: "50% 50%", filter: ca > 0.1 ? "url(#ca)" : undefined }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", left: 0, top: 0 }}>
          <World layer="back" {...worldProps} />
        </svg>
        {chars}
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", left: 0, top: 0 }}>
          <World layer="front" {...worldProps} />
        </svg>
        <LightingLayer scene={sc} gt={gt} frame={frame} />
      </AbsoluteFill>

      {/* screen-space UI (not affected by camera) */}
      <HUD ep={episode} gt={gt} />
      <Labels labels={sc.labels} gt={gt} sceneEnd={sc.t[1]} />
      {isEnding ? <EndingStack ep={episode} gt={gt} t0={sc.t[0]} t1={sc.t[1]} /> : null}
      <KineticSubs chunks={chunks} gt={gt} />

      {/* scene-cut flash */}
      {cutFlash > 0 && <AbsoluteFill style={{ background: rgba(L.key, 0.5 * cutFlash), mixBlendMode: "screen" }} />}
      {/* fade-in at start / out at very end */}
      <AbsoluteFill style={{ background: COLORS.ink, opacity: clamp(1 - gt / 0.4) }} />
    </AbsoluteFill>
  );
};
