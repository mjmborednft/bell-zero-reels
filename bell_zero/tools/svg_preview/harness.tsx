import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "fs";
import { World } from "../../src/WorldEngine";
import { CharacterRig, RIG_ANCHOR } from "../../src/CharacterRig";
import { LightingLayer } from "../../src/LightingLayer";
import { getLighting, W, H } from "../../src/tokens";
import { ease, lerp, clamp } from "../../src/util";
import { facingLeft } from "../../src/layout";

const ep = JSON.parse(fs.readFileSync("episodes/episode_1.json", "utf8"));
const chars = JSON.parse(fs.readFileSync("bible/characters.json", "utf8")).characters;
const times: number[] = JSON.parse(process.argv[2] ?? "[3,12,26,40,55,60,66,70]");
const scale: Record<string, number> = { hero_student_m: 1.12, teacher_harper: 1.2 };
fs.mkdirSync("tools/svg_preview/out", { recursive: true });
times.forEach((gt, n) => {
  const sc = ep.scenes.find((s: any) => gt >= s.t[0] && gt < s.t[1]) ?? ep.scenes.at(-1);
  const lt = gt - sc.t[0]; const prog = clamp(lt / (sc.t[1] - sc.t[0]));
  const zoom = lerp(sc.camera.from, sc.camera.to, ease(sc.camera.easing, prog));
  const frame = Math.round(gt * 30);
  const L = getLighting(sc.lighting);
  const phoneMon = sc.bg_monitors.find((m: any) => m.id === "phone_screen");
  const glow = phoneMon?.content === "school_cctv_feed" ? "#2eff8a" : "#ff2d3a";
  const svg = renderToStaticMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <g transform={`translate(${W / 2},${H / 2}) scale(${zoom}) translate(${-W / 2},${-H / 2})`}>
        <World layer="back" bg={sc.bg} t={lt} gt={gt} lighting={sc.lighting} monitors={sc.bg_monitors} dof={sc.atmosphere.dof} par={0} heroChoiceT={ep.hero_choice.t} sceneId={sc.id} />
        {sc.characters.map((c: any, i: number) => {
          const b = chars.find((x: any) => x.id === c.rig); const s = scale[c.rig] ?? 1.1;
          const flip = facingLeft(sc, c);
          return (
            <svg key={i} x={c.pos[0] * W - RIG_ANCHOR.x * s} y={c.pos[1] * H - RIG_ANCHOR.y * s} width={600 * s} height={900 * s} overflow="visible">
              <CharacterRig bible={b} uid={`c${i}`} frame={frame} fps={30} action={c.action} emotion={c.emotion} mouthAmp={0.5} keyColor={L.key} props={c.props} flip={flip} scale={s} phoneGlow={glow} />
            </svg>
          );
        })}
        <World layer="front" bg={sc.bg} t={lt} gt={gt} lighting={sc.lighting} monitors={sc.bg_monitors} dof={sc.atmosphere.dof} par={0} heroChoiceT={ep.hero_choice.t} sceneId={sc.id} />
        <LightingLayer scene={sc} gt={gt} frame={frame} />
      </g>
    </svg>
  );
  fs.writeFileSync(`tools/svg_preview/out/f${String(n).padStart(2, "0")}.svg`, svg);
});
console.log("wrote", times.length);
