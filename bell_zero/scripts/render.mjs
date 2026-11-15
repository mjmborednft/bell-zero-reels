// Step 7 — final render. Usage: node scripts/render.mjs [episodeNumber]
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const N = process.argv[2] ?? "1";
execFileSync("bash", ["scripts/prepare.sh", N], { stdio: "inherit" });
if (!fs.existsSync("public/audio/mix.wav")) {
  console.error("public/audio/mix.wav missing — refusing to render a silent video. Run make_audio.py + mix_audio.py.");
  process.exit(1);
}
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const comp = await selectComposition({ serveUrl, id: "Episode" });
const outputLocation = `out/BELL_ZERO_E${String(N).padStart(2, "0")}.mp4`;
let last = -1;
await renderMedia({
  composition: comp,
  serveUrl,
  codec: "h264",
  crf: 18,
  pixelFormat: "yuv420p",
  audioCodec: "aac",
  audioBitrate: "192k",
  outputLocation,
  onProgress: ({ progress }) => {
    const p = Math.floor(progress * 100);
    if (p !== last && p % 5 === 0) { console.log(`render ${p}%`); last = p; }
  },
});
console.log("done:", outputLocation);
