// Step 6 — frame-level QA: 9 representative stills -> out/qa_sheet.jpg (3x3 contact sheet).
// Usage: node scripts/qa_sheet.mjs [episodeNumber]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const N = process.argv[2] ?? "1";
execFileSync("bash", ["scripts/prepare.sh", N], { stdio: "inherit" });
const ep = JSON.parse(fs.readFileSync(`episodes/episode_${N}.json`, "utf8"));
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const comp = await selectComposition({ serveUrl, id: "Episode" });

// one frame near the middle of each scene + hero_choice + ending, max 9
const picks = ep.scenes.map((s) => (s.t[0] + s.t[1]) / 2);
picks.push(ep.hero_choice.t + 0.4, ep.meta.duration_target_s - 0.5);
const times = [...new Set(picks.map((t) => Math.round(t * 10) / 10))].sort((a, b) => a - b).slice(0, 9);

fs.mkdirSync("out/qa", { recursive: true });
for (const [i, t] of times.entries()) {
  const out = `out/qa/qa_${String(i).padStart(2, "0")}.jpg`;
  await renderStill({ composition: comp, serveUrl, output: out, frame: Math.round(t * comp.fps), scale: 0.5, imageFormat: "jpeg", jpegQuality: 85 });
  console.log(`qa frame t=${t}s -> ${out}`);
}
execFileSync("ffmpeg", ["-y", "-framerate", "1", "-i", "out/qa/qa_%02d.jpg", "-vf", "tile=3x3", "-frames:v", "1", "out/qa_sheet.jpg"], { stdio: "ignore" });
console.log("QA sheet: out/qa_sheet.jpg — check: face/outfit consistency, subtitles not covering faces, HUD readable, no blank monitors");
