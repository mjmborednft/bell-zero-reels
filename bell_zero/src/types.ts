export type Easing = "linear" | "easeIn" | "easeOut" | "easeInOut";
export type SubColor = "white" | "red" | "yellow";

export interface SubWord { w: string; color: SubColor }
export interface SubGroup { t: number; words: SubWord[] }
export interface Label { t: number; text: string; anchor: [number, number] }
export interface Sfx { t: number; id: string }
export interface Monitor { id: string; content: string; status: "ok" | "warning" | "danger" }
export interface SceneChar {
  rig: string;
  pos: [number, number];
  action: string;
  emotion: string;
  props: string[];
}
export interface Scene {
  id: string;
  type: string;
  t: [number, number];
  lighting: string;
  atmosphere: { fog: number; particles: string; dof: string; detail_density: string };
  bg_monitors: Monitor[];
  camera: { move: string; from: number; to: number; easing: Easing };
  bg: string;
  labels: Label[];
  characters: SceneChar[];
  vo: string;
  subs: SubGroup[];
  sfx: Sfx[];
}
export interface HudCounter {
  id: string;
  label: string;
  value: string;
  events?: { t: number; value: string }[];
}
export interface Episode {
  contract_version: string;
  meta: { day: number; series: string; title: string; language: string; duration_target_s: number; episode: number };
  voice: { provider: string; voice_profile: string; pacing: string };
  hud: { clock_start: string; counters: HudCounter[] };
  hero_choice: { t: number; summary: string };
  scenes: Scene[];
  ending: {
    question: { line: string; color: SubColor }[];
    poll: { prompt: string; options: { n: number; title: string; sub: string }[] };
    cta: string;
    teaser: { kicker: string; title: string; sub: string };
  };
  state_after: unknown;
}
export interface WordTiming { w: string; s: number; e: number }
export interface Alignment {
  /** per scene id -> words with absolute (episode) seconds */
  scenes: Record<string, WordTiming[]>;
}
export interface CharBible {
  id: string;
  display_name: string;
  role: string;
  anatomy: string;
  facial_detail: string[];
  outfit_layers: string[];
  palette: Record<string, string>;
  props: string[];
}
