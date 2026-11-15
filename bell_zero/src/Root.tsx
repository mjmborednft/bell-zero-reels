import React from "react";
import { Composition, getStaticFiles, staticFile } from "remotion";
import { getAudioData } from "@remotion/media-utils";
import { EpisodeComp, EpisodeProps } from "./Episode";
import { FPS, H, W } from "./tokens";
import { Alignment, CharBible, Episode } from "./types";

const exists = async (path: string): Promise<boolean> => {
  try {
    const r = await fetch(staticFile(path), { method: "HEAD" });
    return r.ok;
  } catch {
    return false;
  }
};

/** per-frame RMS envelope of the voice track, normalised to its 95th percentile */
const envelope = async (path: string, fps: number, frames: number): Promise<number[] | null> => {
  try {
    const a = await getAudioData(staticFile(path));
    const ch = a.channelWaveforms[0];
    const spf = Math.floor(a.sampleRate / fps);
    const raw: number[] = [];
    for (let f = 0; f < frames; f++) {
      let sum = 0, n = 0;
      for (let i = f * spf; i < Math.min(ch.length, (f + 1) * spf); i += 2) { sum += ch[i] * ch[i]; n++; }
      raw.push(n ? Math.sqrt(sum / n) : 0);
    }
    const sorted = [...raw].sort((x, y) => x - y);
    const ref = sorted[Math.floor(sorted.length * 0.95)] || 1;
    // 3-frame smoothing
    return raw.map((_, i) => {
      const v = ((raw[i - 1] ?? raw[i]) + raw[i] + (raw[i + 1] ?? raw[i])) / 3;
      return Math.min(1, v / ref);
    });
  } catch {
    return null;
  }
};

export const Root: React.FC = () => {
  void getStaticFiles;
  return (
    <Composition
      id="Episode"
      component={EpisodeComp as unknown as React.FC<Record<string, unknown>>}
      width={W}
      height={H}
      fps={FPS}
      durationInFrames={FPS * 77}
      defaultProps={{ episode: null, characters: [], alignment: null, voAmp: null, hasMix: false } satisfies EpisodeProps as unknown as Record<string, unknown>}
      calculateMetadata={async () => {
        // The render scripts copy the active episode + bible to public/ (zero engine rewrites per episode).
        const episode: Episode = await (await fetch(staticFile("episode.json"))).json();
        const chars: { characters: CharBible[] } = await (await fetch(staticFile("bible/characters.json"))).json();
        const alignment: Alignment | null = (await exists("audio/alignment.json")) ? await (await fetch(staticFile("audio/alignment.json"))).json() : null;
        const frames = Math.ceil(episode.meta.duration_target_s * FPS);
        const hasVo = await exists("audio/vo_full.wav");
        const voAmp = hasVo ? await envelope("audio/vo_full.wav", FPS, frames) : null;
        const hasMix = await exists("audio/mix.wav");
        const props: EpisodeProps = { episode, characters: chars.characters, alignment, voAmp, hasMix };
        return { durationInFrames: frames, props: props as unknown as Record<string, unknown> };
      }}
    />
  );
};
