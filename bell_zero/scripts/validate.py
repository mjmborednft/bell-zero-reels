#!/usr/bin/env python3
"""Step 1 of the pipeline: validate episode.json (contract v3) against the bible.

Usage: python3 scripts/validate.py episodes/episode_1.json [bible_dir]
Exit code 1 on any ERROR. WARN lines never fail the build.
"""
import json, sys, os

ep_path = sys.argv[1] if len(sys.argv) > 1 else "episodes/episode_1.json"
bible_dir = sys.argv[2] if len(sys.argv) > 2 else "bible"

ep = json.load(open(ep_path, encoding="utf-8"))
chars = json.load(open(os.path.join(bible_dir, "characters.json"), encoding="utf-8"))
bgs = json.load(open(os.path.join(bible_dir, "backgrounds.json"), encoding="utf-8"))
rigs = {c["id"]: c for c in chars["characters"]}
bg_ids = {b["id"] for b in bgs["backgrounds"]}

errors, warns = [], []
E = errors.append
Wn = warns.append

if ep.get("contract_version") != "v3":
    E(f"contract_version must be 'v3', got {ep.get('contract_version')!r}")
for name, doc in (("characters", chars), ("backgrounds", bgs)):
    if doc.get("canon_version") != "v3":
        Wn(f"{name} canon_version is {doc.get('canon_version')!r}, expected 'v3'")

scenes = ep.get("scenes", [])
if not scenes:
    E("no scenes")
dur = ep["meta"]["duration_target_s"]
VO_WPS = 2.6  # typical narration speed, words/second

for i, s in enumerate(scenes):
    sid = s["id"]
    t0, t1 = s["t"]
    for c in s.get("characters", []):
        if c["rig"] not in rigs:
            E(f"{sid}: rig '{c['rig']}' not in bible/characters.json")
        else:
            allowed = set(rigs[c["rig"]].get("props", []))
            bad = [p for p in c.get("props", []) if p not in allowed]
            if bad:
                Wn(f"{sid}: props {bad} not listed for {c['rig']} in the bible")
    if s["bg"] not in bg_ids:
        E(f"{sid}: bg '{s['bg']}' not in bible/backgrounds.json")
    if i + 1 < len(scenes) and t1 != scenes[i + 1]["t"][0]:
        E(f"{sid}: not contiguous with {scenes[i+1]['id']} ({t1} != {scenes[i+1]['t'][0]})")
    for key in ("labels", "subs", "sfx"):
        for e in s.get(key, []):
            if not (t0 <= e["t"] <= t1):
                E(f"{sid}: {key} event at t={e['t']} is outside the scene window [{t0},{t1}]")
    words = len(s["vo"].split())
    need = words / VO_WPS
    window = t1 - t0 - 0.3
    if need > window * 1.12:
        Wn(f"{sid}: VO ~{need:.1f}s ({words} words) vs {window:.1f}s window — audio will be time-stretched or trimmed")
    if not s.get("vo", "").strip():
        E(f"{sid}: empty vo (silent scenes are not allowed)")

if scenes:
    if scenes[0]["t"][0] != 0:
        E("first scene must start at t=0")
    if abs(scenes[-1]["t"][1] - dur) > 1e-6:
        E(f"last scene ends at {scenes[-1]['t'][1]}, duration_target_s is {dur}")

for c in ep["hud"]["counters"]:
    for e in c.get("events", []):
        if not (0 <= e["t"] <= dur):
            E(f"hud counter '{c['id']}' event t={e['t']} outside the episode")

hc = ep["hero_choice"]["t"]
if not any(s["t"][0] <= hc < s["t"][1] for s in scenes):
    E(f"hero_choice t={hc} is not inside any scene")
ending = scenes[-1]
if ending.get("type") != "ending_card":
    Wn("last scene is not of type 'ending_card' — the ending stack (question/poll/CTA/teaser) overlays that scene")
opts = ep["ending"]["poll"]["options"]
if len(opts) != 2:
    E("poll must have exactly 2 options (equal-cost choice)")

print(f"{os.path.basename(ep_path)}: {len(scenes)} scenes, {dur}s")
for w in warns: print("WARN ", w)
for e in errors: print("ERROR", e)
print("RESULT:", "FAILED" if errors else "OK")
sys.exit(1 if errors else 0)
